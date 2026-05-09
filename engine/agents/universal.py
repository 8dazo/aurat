"""
universal.py — AutoApplyAgent: the single orchestrator for all ATS platforms.

Pipeline stages (explicit state machine so every step is observable):
  NAVIGATE → DETECT → CLICK_APPLY → DETECT_FIELDS →
  MAP_FIELDS → FILL_FIELDS → REVIEW → SUBMIT → DONE
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
from enum import Enum
from typing import Optional

from playwright.async_api import Page

from agents.base import BaseAgent
from agents.detector import APPLY_BUTTON_SELECTORS, PageContext, analyze_page
from llm.client import LLMClient
from utils.human_input import human_click, human_delay, human_type

logger = logging.getLogger(__name__)
llm = LLMClient()

# Lazy import memory to avoid loading sentence-transformers at startup
_memory: Optional[object] = None


def _get_memory():
    global _memory
    if _memory is None:
        try:
            from memory.collections import MemoryCollections

            _memory = MemoryCollections()
        except ImportError:
            _memory = None
    return _memory


# ---------------------------------------------------------------------------
# Stage enum
# ---------------------------------------------------------------------------


class ApplyStage(str, Enum):
    NAVIGATE = "navigate"
    DETECT = "detect"
    CLICK_APPLY = "click_apply"
    DETECT_FIELDS = "detect_fields"
    MAP_FIELDS = "map_fields"
    FILL_FIELDS = "fill_fields"
    REVIEW = "review"
    SUBMIT = "submit"
    DONE = "done"


# ---------------------------------------------------------------------------
# LLM prompt for field mapping
# ---------------------------------------------------------------------------

FIELD_MAP_PROMPT = """\
You are an expert ATS form field mapper. Given a list of form fields (with their label, \
type, placeholder, aria-label, and surrounding context), and a candidate profile, map \
each field to the best matching profile value.

Rules:
- Semantic matching: "Given Name" = "First Name" = personal_info.first_name
- For select/radio/dropdown fields, value MUST be one of the provided options (pick the closest)
- For file fields (e.g. "Upload Resume", "Attach CV"), set value = "__RESUME_FILE__"
- For checkbox fields (e.g. "I agree to terms"), set value = "true" or "false"
- For custom/unknown questions with no clear profile mapping, set profile_key = null and value = null
- confidence 0-100: how sure are you this mapping is correct

Output ONLY a valid JSON object with a "mappings" array:
{{"mappings": [{{"label": str, "field_type": str, "profile_key": str|null, "confidence": int, "value": str|null}}]}}

Form fields:
{fields}

Profile:
{profile}
"""

# Custom React-Select / Choices.js / Lever picker selectors
CUSTOM_PICKER_CONTAINER_SELECTORS = [
    '[class*="select__control"]',  # React-Select
    '[class*="choices__inner"]',  # Choices.js
    ".select2-selection",  # Select2
    '[class*="dropdown-trigger"]',
    '[role="combobox"]',
    '[role="listbox"]',
]

CUSTOM_PICKER_OPTION_SELECTORS = [
    '[class*="select__option"]',
    '[class*="choices__item--selectable"]',
    ".select2-results__option",
    '[role="option"]',
]


# ---------------------------------------------------------------------------
# AutoApplyAgent
# ---------------------------------------------------------------------------


class AutoApplyAgent(BaseAgent):
    def __init__(self, profile: dict):
        super().__init__(profile)
        self.page_ctx: Optional[PageContext] = None
        self.current_stage: ApplyStage = ApplyStage.NAVIGATE

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _stage(self, stage: ApplyStage, status: str = "running", detail: str = ""):
        self.current_stage = stage
        self.log_step(stage.value, status, detail)

    def _qna_lookup(self, question: str) -> Optional[str]:
        """Check profile's custom_qna_memory for a pre-existing answer."""
        mem = self.profile.get("custom_qna_memory", {})
        if not mem:
            return None
        q_lower = question.lower().strip()
        # Exact match
        if q_lower in mem:
            return mem[q_lower]
        # Hash match (same key style as db/crud.py)
        q_hash = hashlib.sha256(q_lower.encode()).hexdigest()[:16]
        if q_hash in mem:
            return mem[q_hash]
        # Fuzzy: any key that is a substring of the question or vice-versa
        for key, answer in mem.items():
            if key in q_lower or q_lower in key:
                return answer
        return None

    async def _qna_lookup_hybrid(self, question: str) -> Optional[str]:
        """
        Two-stage Q&A lookup:
          1. Fast: hash/exact match in profile dict (existing behavior)
          2. Semantic: QMD-style hybrid search over memory_documents
        Returns best answer or None.
        """
        # Stage 1: fast hash/exact lookup (no I/O)
        cached = self._qna_lookup(question)
        if cached:
            return cached

        # Stage 2: semantic search via hybrid store
        mem = _get_memory()
        if mem is not None:
            try:
                answer = await mem.best_qna_answer(question, min_score=0.4)
                if answer:
                    logger.info("Memory semantic hit for: %s", question[:60])
                    return answer
            except Exception as e:
                logger.debug("Hybrid QnA lookup failed: %s", e)

        return None

    # ------------------------------------------------------------------
    # Stage implementations
    # ------------------------------------------------------------------

    async def detect_form_fields(self, page: Page) -> list[dict]:
        """Unified field extractor — handles standard inputs + custom pickers."""
        fields: list[dict] = []
        seen_ids: set[str] = set()

        for frame in page.frames:
            all_inputs = await frame.query_selector_all(
                "input:not([type=hidden]), select, textarea"
            )

            for el in all_inputs[:60]:
                try:
                    input_type = await el.get_attribute("type") or "text"
                    tag = await el.evaluate("el => el.tagName.toLowerCase()")
                    field_type = {"select": "select", "textarea": "textarea"}.get(
                        tag, input_type
                    )

                    el_id = await el.get_attribute("id") or ""
                    el_name = await el.get_attribute("name") or ""
                    uid = el_id or el_name or str(id(el))
                    if uid in seen_ids:
                        continue
                    seen_ids.add(uid)

                    # Gather label from multiple sources
                    label_text = ""
                    if el_id:
                        label_el = await frame.query_selector(f'label[for="{el_id}"]')
                        if label_el:
                            label_text = (await label_el.text_content() or "").strip()
                    if not label_text:
                        # aria-labelledby
                        labelledby = await el.get_attribute("aria-labelledby")
                        if labelledby:
                            for lid in labelledby.split():
                                lel = await frame.query_selector(f"#{lid}")
                                if lel:
                                    label_text = (await lel.text_content() or "").strip()
                                    break
                    if not label_text:
                        placeholder = await el.get_attribute("placeholder") or ""
                        aria_label = await el.get_attribute("aria-label") or ""
                        label_text = placeholder or aria_label or el_name or tag

                    # Gather options for select/radio
                    options: list[str] = []
                    if field_type == "select":
                        opt_els = await el.query_selector_all("option")
                        for o in opt_els:
                            txt = (await o.text_content() or "").strip()
                            if txt and txt.lower() not in ("", "select...", "choose..."):
                                options.append(txt)
                    elif field_type == "radio":
                        # Find sibling radios with same name
                        if el_name:
                            siblings = await frame.query_selector_all(
                                f'input[type="radio"][name="{el_name}"]'
                            )
                            for sib in siblings:
                                sib_id = await sib.get_attribute("id") or ""
                                sib_lbl = ""
                                if sib_id:
                                    l = await frame.query_selector(f'label[for="{sib_id}"]')
                                    if l:
                                        sib_lbl = (await l.text_content() or "").strip()
                                sib_val = await sib.get_attribute("value") or ""
                                options.append(sib_lbl or sib_val)

                    fields.append(
                        {
                            "label": label_text.strip(),
                            "type": field_type,
                            "element": el,
                            "id": el_id,
                            "name": el_name,
                            "options": options,
                        }
                    )
                except Exception as exc:
                    logger.debug("Field detection error: %s", exc)

            # Also detect custom pickers (React-Select, etc.)
            for picker_sel in CUSTOM_PICKER_CONTAINER_SELECTORS:
                pickers = await frame.query_selector_all(picker_sel)
                for picker in pickers:
                    try:
                        uid = await picker.evaluate(
                            "el => el.getAttribute('id') || el.getAttribute('data-id') || ''"
                        )
                        if uid in seen_ids:
                            continue
                        seen_ids.add(uid or str(id(picker)))

                        # Find associated label
                        label_text = ""
                        wrapper = await picker.evaluate_handle(
                            'el => el.closest(\'[class*="form-group"], [class*="field"], '
                            '[class*="question"], [class*="input-group"]\') || el.parentElement'
                        )
                        if wrapper:
                            lbl = await wrapper.query_selector("label")
                            if lbl:
                                label_text = (await lbl.text_content() or "").strip()

                        fields.append(
                            {
                                "label": label_text or "custom_picker",
                                "type": "custom_select",
                                "element": picker,
                                "id": uid,
                                "name": uid,
                                "options": [],
                            }
                        )
                    except Exception as exc:
                        logger.debug("Custom picker detection error: %s", exc)

        return fields

    async def map_fields(self, fields: list[dict]) -> list[dict]:
        field_labels = [
            {"label": f["label"], "type": f["type"], "options": f.get("options", [])}
            for f in fields
        ]
        prompt = FIELD_MAP_PROMPT.format(
            fields=json.dumps(field_labels, indent=2),
            profile=json.dumps(self.profile, indent=2),
        )

        from pydantic import BaseModel
        from typing import Optional as Opt

        class FieldMapping(BaseModel):
            label: str
            field_type: str
            profile_key: Opt[str] = None
            confidence: int = 0
            value: Opt[str] = None

        class FieldMappingList(BaseModel):
            mappings: list[FieldMapping]

        result = await llm.extract_structured(prompt, FieldMappingList, "")
        return [m.model_dump() for m in result.mappings]

    async def fill_field(self, page: Page, field: dict, value: str):
        """Type-aware field filler — handles all input types."""
        el = field.get("element")
        if not el:
            return
        field_type = field.get("type", "text")

        # File upload
        if value == "__RESUME_FILE__" or field_type == "file":
            path = self.resume_path
            if not path or not os.path.exists(path):
                self.log_step(
                    "file_upload", "skipped", "resume_path not set or file missing"
                )
                return
            try:
                async with page.expect_file_chooser(timeout=5000) as fc_info:
                    await el.click()
                fc = await fc_info.value
                await fc.set_files(path)
                self.log_step("file_upload", "completed", os.path.basename(path))
            except Exception as exc:
                logger.warning("File upload failed: %s", exc)
            return

        if field_type == "select":
            options = await el.query_selector_all("option")
            best: tuple[int, str | None] = (-1, None)
            for opt in options:
                txt = (await opt.text_content() or "").strip()
                v_lower = value.lower()
                t_lower = txt.lower()
                score = 0
                if t_lower == v_lower:
                    score = 100
                elif v_lower in t_lower or t_lower in v_lower:
                    score = 60
                if score > best[0]:
                    best = (score, await opt.get_attribute("value") or txt)
            if best[1] is not None:
                await el.select_option(value=best[1])
            return

        if field_type == "custom_select":
            # Open the picker first
            try:
                await el.click()
                await page.wait_for_timeout(400)
                # Find visible option elements
                for opt_sel in CUSTOM_PICKER_OPTION_SELECTORS:
                    opt_els = await page.query_selector_all(opt_sel)
                    visible_opts = []
                    for o in opt_els:
                        if await o.is_visible():
                            txt = (await o.text_content() or "").strip()
                            visible_opts.append((txt, o))
                    if visible_opts:
                        # Fuzzy match
                        v_lower = value.lower()
                        best_opt = None
                        best_score = -1
                        for txt, o in visible_opts:
                            t = txt.lower()
                            score = 0
                            if t == v_lower:
                                score = 100
                            elif v_lower in t or t in v_lower:
                                score = 60
                            if score > best_score:
                                best_score = score
                                best_opt = o
                        if best_opt and best_score >= 0:
                            await best_opt.click()
                            return
                # Close picker if nothing matched
                await page.keyboard.press("Escape")
            except Exception as exc:
                logger.warning("Custom select fill error: %s", exc)
            return

        if field_type == "radio":
            name = field.get("name", "")
            if name:
                radios = await page.query_selector_all(
                    f'input[type="radio"][name="{name}"]'
                )
                v_lower = value.lower()
                for radio in radios:
                    radio_id = await radio.get_attribute("id") or ""
                    radio_val = (await radio.get_attribute("value") or "").lower()
                    radio_label = ""
                    if radio_id:
                        lbl = await page.query_selector(f'label[for="{radio_id}"]')
                        if lbl:
                            radio_label = (
                                (await lbl.text_content() or "").strip().lower()
                            )
                    if (
                        v_lower in radio_val
                        or v_lower in radio_label
                        or radio_val in v_lower
                    ):
                        await radio.click()
                        return
            return

        if field_type == "checkbox":
            is_checked = await el.is_checked()
            should_check = str(value).lower() in ("true", "yes", "1")
            if should_check != is_checked:
                await el.click()
            return

        # Default: text / textarea / email / tel / number
        try:
            await el.scroll_into_view_if_needed()
            await el.click()
            await el.fill("")
            await el.type(value, delay=80)
        except Exception as exc:
            logger.warning("Text fill fallback error: %s", exc)
            try:
                await el.fill(value)
            except Exception:
                pass

    async def submit(self, page: Page):
        selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit Application")',
            'button:has-text("Submit")',
        ]
        for sel in selectors:
            for frame in page.frames:
                try:
                    btn = await frame.query_selector(sel)
                    if btn and await btn.is_visible():
                        await btn.scroll_into_view_if_needed()
                        await btn.click()
                        return
                except Exception:
                    pass
        await page.keyboard.press("Enter")

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    async def run(self, page: Page):
        confidence_threshold = 60

        # ── STAGE: DETECT ─────────────────────────────────────────────
        self._stage(ApplyStage.DETECT, "running", "Analyzing page…")
        ctx = await analyze_page(page)
        self.page_ctx = ctx
        self._stage(
            ApplyStage.DETECT,
            "completed",
            f"platform={ctx.platform} type={ctx.page_type} fields={ctx.visible_field_count}",
        )

        # ── STAGE: CLICK_APPLY (description pages only) ───────────────
        if ctx.page_type == "description_only":
            self._stage(ApplyStage.CLICK_APPLY, "running", "Looking for Apply button…")
            clicked = False

            # Try the selector we detected, then fall back to all candidates
            candidates = (
                [ctx.apply_button_selector] + APPLY_BUTTON_SELECTORS
                if ctx.apply_button_selector
                else APPLY_BUTTON_SELECTORS
            )
            for sel in candidates:
                if not sel:
                    continue
                try:
                    btn = await page.query_selector(sel)
                    if btn and await btn.is_visible():
                        await btn.click()
                        clicked = True
                        break
                except Exception:
                    pass

            if clicked:
                try:
                    await page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    await page.wait_for_timeout(2000)
                self._stage(
                    ApplyStage.CLICK_APPLY, "completed", "Application form loaded"
                )
            else:
                self._stage(
                    ApplyStage.CLICK_APPLY, "paused", "Could not find Apply button"
                )
                await self.pause(
                    "Could not find Apply button — click it manually then resume"
                )
                while self.paused:
                    await asyncio.sleep(0.5)

        # ── STAGE: DETECT_FIELDS ──────────────────────────────────────
        self._stage(ApplyStage.DETECT_FIELDS, "running")
        fields = await self.detect_form_fields(page)
        self._stage(
            ApplyStage.DETECT_FIELDS, "completed", f"{len(fields)} fields found"
        )

        if not fields:
            self._stage(
                ApplyStage.DETECT_FIELDS,
                "skipped",
                "No fields detected — check page manually",
            )
            return

        # ── STAGE: MAP_FIELDS ─────────────────────────────────────────
        self._stage(ApplyStage.MAP_FIELDS, "running")
        mappings = await self.map_fields(fields)
        self._stage(ApplyStage.MAP_FIELDS, "completed", f"{len(mappings)} mappings")

        # ── STAGE: FILL_FIELDS ────────────────────────────────────────
        self._stage(
            ApplyStage.FILL_FIELDS, "running", f"Filling {len(mappings)} fields"
        )

        for i, mapping in enumerate(mappings):
            while self.paused:
                await asyncio.sleep(0.5)

            label = mapping.get("label", f"field_{i}")
            value = mapping.get("value")
            confidence = mapping.get("confidence", 0)
            field = fields[i] if i < len(fields) else {}

            if value == "__RESUME_FILE__":
                self.log_step(f"fill_{label}", "running", "Uploading resume file")
                await human_delay()
                await self.fill_field(page, field, value)
                self.log_step(f"fill_{label}", "completed")

            elif confidence >= confidence_threshold and value:
                self.log_step(f"fill_{label}", "running", f"{value[:40]}")
                await human_delay()
                await self.fill_field(page, field, value)
                self.log_step(f"fill_{label}", "completed")

            elif mapping.get("profile_key") is None:
                # Custom question — try hybrid QnA memory first
                cached = await self._qna_lookup_hybrid(label)
                if cached:
                    self.log_step(f"fill_{label}", "running", f"memory: {cached[:40]}")
                    await human_delay()
                    await self.fill_field(page, field, cached)
                    self.log_step(f"fill_{label}", "completed", "answered from memory")
                else:
                    self.log_step(f"custom_{label}", "paused", "Manual answer required")
                    await self.pause(f"Custom question: {label}")
                    while self.paused:
                        await asyncio.sleep(0.5)
                    answer = next(
                        (
                            q["answer"]
                            for q in self.custom_questions
                            if q["question"] == label
                        ),
                        None,
                    )
                    if answer and field:
                        await self.fill_field(page, field, answer)
                    # Save to hybrid memory for future use
                    if answer:
                        mem = _get_memory()
                        if mem is not None:
                            try:
                                job_url = self.profile.get("_current_job_url", "")
                                company = self.profile.get("_current_company", "")
                                await mem.save_qna(label, answer, job_url, company)
                            except Exception as e:
                                logger.debug("Memory save_qna failed: %s", e)
                    self.log_step(f"custom_{label}", "completed")
            else:
                self.log_step(
                    f"skip_{label}",
                    "skipped",
                    f"confidence={confidence} no_value={value is None}",
                )

        self._stage(ApplyStage.FILL_FIELDS, "completed")

        # ── STAGE: REVIEW ─────────────────────────────────────────────
        self._stage(ApplyStage.REVIEW, "paused", "Review form before submitting")
        await self.pause("Review before submission")
        while self.paused:
            await asyncio.sleep(0.5)

        # ── STAGE: SUBMIT ─────────────────────────────────────────────
        self._stage(ApplyStage.SUBMIT, "running")
        await self.submit(page)
        self._stage(ApplyStage.SUBMIT, "completed")
        self._stage(ApplyStage.DONE, "completed", "Application submitted ✓")

        # ── POST-RUN: Enrich profile from Q&A facts ───────────────────
        if self.custom_questions:
            try:
                from memory.profile_builder import ProfileBuilder
                from db.crud import (
                    get_profile as db_get_profile,
                    save_profile as db_save_profile,
                )

                builder = ProfileBuilder()
                job_url = self.profile.get("_current_job_url", "")
                company = self.profile.get("_current_company", "")
                await builder.extract_and_save_facts(
                    self.custom_questions, job_url=job_url, company=company
                )
                profile = await db_get_profile() or self.profile
                enriched = await builder.enrich_profile(profile, job_url=job_url)
                await db_save_profile(enriched)
                logger.info("Profile enriched after job application")
            except Exception as e:
                logger.warning("Post-run profile enrichment failed: %s", e)
