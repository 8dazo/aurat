from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os

from agents.base import BaseAgent
from playwright.async_api import Page
from utils.human_input import human_type, human_click, human_delay
from llm.client import LLMClient

logger = logging.getLogger(__name__)

CUSTOM_PICKER_OPTION_SELECTORS = [
    '[class*="select__option"]',
    '[class*="choices__item--selectable"]',
    '.select2-results__option',
    '[role="option"]',
]

llm = LLMClient()

FIELD_MAP_PROMPT = """You are an ATS form field mapper. Given form field labels and a candidate profile, map each field to the corresponding profile value.

For each field, return:
- label: the field label text
- field_type: one of "text", "select", "textarea", "file", "checkbox"
- profile_key: the dot-notation path to the value in the profile (e.g., "personal_info.first_name", "personal_info.email")
- confidence: 0-100 how confident you are in this mapping
- value: the value to fill from the profile

If a field cannot be mapped (custom question), set profile_key to null, confidence to 0, and value to null.

Output valid JSON array matching this schema:
[{{"label": str, "field_type": str, "profile_key": str|null, "confidence": int, "value": str|null}}]

Form fields:
{fields}

Profile:
{profile}"""


class GreenhouseAgent(BaseAgent):
    def __init__(self, profile: dict):
        super().__init__(profile)

    async def detect_form_fields(self, page: Page) -> list[dict]:
        fields = []
        all_inputs = await page.query_selector_all("input, select, textarea")
        for el in all_inputs[:50]:
            input_type = await el.get_attribute("type") or "text"
            if input_type == "hidden":
                continue
            tag = await el.evaluate("el => el.tagName.toLowerCase()")
            field_type = {"select": "select", "textarea": "textarea"}.get(
                tag, input_type
            )
            label_text = ""
            el_id = await el.get_attribute("id")
            if el_id:
                label_el = await page.query_selector(f'label[for="{el_id}"]')
                if label_el:
                    label_text = (await label_el.text_content() or "").strip()
            if not label_text:
                placeholder = await el.get_attribute("placeholder")
                aria_label = await el.get_attribute("aria-label")
                name_attr = await el.get_attribute("name")
                label_text = placeholder or aria_label or name_attr or tag
            fields.append(
                {
                    "label": label_text,
                    "type": field_type,
                    "element": el,
                }
            )
        return fields

    async def map_fields(self, fields: list[dict]) -> list[dict]:
        field_labels = [{"label": f["label"], "type": f["type"]} for f in fields]
        prompt = FIELD_MAP_PROMPT.format(
            fields=json.dumps(field_labels, indent=2),
            profile=json.dumps(self.profile, indent=2),
        )
        from pydantic import BaseModel
        from typing import Optional

        class FieldMapping(BaseModel):
            label: str
            field_type: str
            profile_key: Optional[str] = None
            confidence: int = 0
            value: Optional[str] = None

        class FieldMappingList(BaseModel):
            mappings: list[FieldMapping]

        result = await llm.extract_structured(prompt, FieldMappingList, "")
        return [m.model_dump() for m in result.mappings]

    def _qna_lookup(self, question: str) -> str | None:
        mem = self.profile.get("custom_qna_memory", {})
        if not mem:
            return None
        q_lower = question.lower().strip()
        if q_lower in mem:
            return mem[q_lower]
        q_hash = hashlib.sha256(q_lower.encode()).hexdigest()[:16]
        if q_hash in mem:
            return mem[q_hash]
        for key, answer in mem.items():
            if key in q_lower or q_lower in key:
                return answer
        return None

    async def fill_field(self, page: Page, field: dict, value: str):
        el = field.get("element")
        if not el:
            return
        field_type = field.get("type", "text")

        # File upload — use resume_path from profile
        if value == "__RESUME_FILE__" or field_type == "file":
            path = self.resume_path or value
            if not path or not os.path.exists(path):
                logger.warning("File upload skipped: path not found: %s", path)
                return
            try:
                async with page.expect_file_chooser(timeout=5000) as fc_info:
                    await el.click()
                fc = await fc_info.value
                await fc.set_files(path)
            except Exception as exc:
                logger.warning("File upload error: %s", exc)
            return

        if field_type == "select":
            options = await el.query_selector_all("option")
            v_lower = value.lower()
            best = (-1, None)
            for opt in options:
                txt = (await opt.text_content() or "").strip().lower()
                score = 0
                if txt == v_lower:
                    score = 100
                elif v_lower in txt or txt in v_lower:
                    score = 60
                if score > best[0]:
                    best = (score, opt)
            if best[1]:
                await best[1].click()
            return

        if field_type == "custom_select":
            try:
                await el.click()
                await page.wait_for_timeout(400)
                for opt_sel in CUSTOM_PICKER_OPTION_SELECTORS:
                    opts = await page.query_selector_all(opt_sel)
                    visible = [(await o.text_content() or "").strip(), o]
                    visible = [(t, o) for t, o in visible if t and await o.is_visible()]
                    if visible:
                        v_lower = value.lower()
                        best_o, best_s = None, -1
                        for txt, o in visible:
                            t = txt.lower()
                            s = 100 if t == v_lower else (60 if v_lower in t or t in v_lower else 0)
                            if s > best_s:
                                best_s, best_o = s, o
                        if best_o and best_s >= 0:
                            await best_o.click()
                            return
                await page.keyboard.press("Escape")
            except Exception as exc:
                logger.warning("Custom select error: %s", exc)
            return

        if field_type == "radio":
            name = field.get("name", "")
            if name:
                radios = await page.query_selector_all(
                    f'input[type="radio"][name="{name}"]'
                )
                v_lower = value.lower()
                for radio in radios:
                    rid = await radio.get_attribute("id") or ""
                    rval = (await radio.get_attribute("value") or "").lower()
                    rlabel = ""
                    if rid:
                        lbl = await page.query_selector(f'label[for="{rid}"]')
                        if lbl:
                            rlabel = (await lbl.text_content() or "").strip().lower()
                    if v_lower in rval or v_lower in rlabel or rval in v_lower:
                        await radio.click()
                        return
            return

        if field_type == "checkbox":
            is_checked = await el.is_checked()
            should = str(value).lower() in ("true", "yes", "1")
            if should != is_checked:
                await el.click()
            return

        # text / textarea / email / tel / number
        selector = await el.evaluate("el => el.id || el.name || ''")
        if selector:
            has_id = await el.evaluate("el => !!el.id")
            await human_type(
                page,
                f"#{selector}" if has_id else f"[name='{selector}']",
                value,
            )
        else:
            await el.click()
            await page.keyboard.type(value, delay=100)

    async def submit(self, page: Page):
        submit_btn = await page.query_selector(
            'button[type="submit"], input[type="submit"]'
        )
        if submit_btn:
            await human_click(page, 'button[type="submit"], input[type="submit"]')
        else:
            await page.keyboard.press("Enter")

    async def run(self, page: Page):
        self.log_step("detect_fields", "running")
        fields = await self.detect_form_fields(page)
        self.log_step("detect_fields", "completed", f"Found {len(fields)} fields")

        self.log_step("map_fields", "running")
        mappings = await self.map_fields(fields)
        self.log_step("map_fields", "completed", f"Mapped {len(mappings)} fields")

        confidence_threshold = 60
        for i, mapping in enumerate(mappings):
            while self.paused:
                await asyncio.sleep(0.5)

            if mapping.get("confidence", 0) >= confidence_threshold and mapping.get(
                "value"
            ):
                self.log_step(
                    f"fill_{mapping['label']}",
                    "running",
                    f"Value: {mapping['value'][:30]}",
                )
                await human_delay()
                await self.fill_field(
                    page, fields[i] if i < len(fields) else {}, mapping["value"]
                )
                self.log_step(f"fill_{mapping['label']}", "completed")
            elif mapping.get("profile_key") is None:
                label = mapping["label"]
                # Check QnA memory before interrupting the user
                cached = self._qna_lookup(label)
                if cached:
                    self.log_step(f"fill_{label}", "running", f"memory: {cached[:40]}")
                    await human_delay()
                    await self.fill_field(page, fields[i] if i < len(fields) else {}, cached)
                    self.log_step(f"fill_{label}", "completed", "answered from memory")
                else:
                    self.log_step(f"custom_{label}", "paused", "Manual answer required")
                    await self.pause(f"Custom question: {label}")
                    while self.paused:
                        await asyncio.sleep(0.5)
                    answer = next(
                        (q["answer"] for q in self.custom_questions if q["question"] == label),
                        None,
                    )
                    if answer and i < len(fields):
                        await self.fill_field(page, fields[i], answer)
                    self.log_step(f"custom_{label}", "completed")
            else:
                self.log_step(
                    f"skip_{mapping['label']}",
                    "skipped",
                    f"Low confidence: {mapping.get('confidence')}",
                )

        self.log_step("pre_submit", "paused", "Awaiting user review")
        await self.pause("Review before submission")
        while self.paused:
            await asyncio.sleep(0.5)

        self.log_step("submit", "running")
        await self.submit(page)
        self.log_step("submit", "completed")
