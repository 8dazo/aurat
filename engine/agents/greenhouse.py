from agents.base import BaseAgent
from playwright.async_api import Page
from utils.human_input import human_type, human_click, human_delay
from llm.client import LLMClient
import json
import asyncio

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

    async def fill_field(self, page: Page, field: dict, value: str):
        el = field.get("element")
        if not el:
            return
        field_type = field.get("type", "text")
        if field_type == "select":
            options = await el.query_selector_all("option")
            for opt in options:
                opt_text = (await opt.text_content() or "").strip().lower()
                if value.lower() in opt_text or opt_text in value.lower():
                    await opt.click()
                    return
            if options:
                await options[-1].click()
        elif field_type == "checkbox":
            is_checked = await el.is_checked()
            if str(value).lower() in ("true", "yes", "1"):
                if not is_checked:
                    await el.click()
        elif field_type == "file":
            import os

            resolved = (
                value if os.path.isabs(value) else os.path.join(os.getcwd(), value)
            )
            async with page.expect_file_chooser(timeout=5000) as fc_info:
                await el.click()
            file_chooser = await fc_info.value
            if os.path.exists(resolved):
                await file_chooser.set_files(resolved)
        else:
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
                self.log_step(
                    f"custom_{mapping['label']}",
                    "paused",
                    "Manual intervention required",
                )
                await self.pause(f"Custom question: {mapping['label']}")
                while self.paused:
                    await asyncio.sleep(0.5)
                answer = next(
                    (
                        q["answer"]
                        for q in self.custom_questions
                        if q["question"] == mapping["label"]
                    ),
                    None,
                )
                if answer and i < len(fields):
                    await self.fill_field(page, fields[i], answer)
                self.log_step(f"custom_{mapping['label']}", "completed")
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
