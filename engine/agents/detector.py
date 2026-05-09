"""
detector.py — Pre-flight page intelligence for Aurat.

Identifies:
  1. Which ATS platform a page belongs to (greenhouse, lever, workday, ashby, icims, generic).
  2. Whether the page is a pure job-description (needing a click to open the form),
     an already-loaded application form, or a multi-step wizard.

Both are determined from DOM signals + URL patterns so we never need a second LLM call
for this cheap classification step.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from playwright.async_api import Page

ATS_PLATFORM = Literal["greenhouse", "lever", "workday", "ashby", "icims", "generic"]
PAGE_TYPE = Literal["description_only", "form", "multi_step"]


# ---------------------------------------------------------------------------
# Signals per ATS
# ---------------------------------------------------------------------------

_ATS_SIGNALS: dict[str, dict] = {
    "greenhouse": {
        "url_patterns": [r"greenhouse\.io", r"grnh\.se"],
        "meta_selectors": ['[data-source="greenhouse"]'],
        "dom_selectors": ["#app", "#greenhouse-app", '[class*="greenhouse"]'],
        "script_patterns": [r"greenhouse\.io/embed"],
    },
    "lever": {
        "url_patterns": [r"jobs\.lever\.co", r"lever\.co/apply"],
        "meta_selectors": [],
        "dom_selectors": ['[class*="lever-"]', "#lever-jobs-container"],
        "script_patterns": [r"lever\.co"],
    },
    "workday": {
        "url_patterns": [r"myworkdayjobs\.com", r"wd\d+\.myworkdayjobs"],
        "meta_selectors": [],
        "dom_selectors": ['[data-automation-id]', "[data-uxi-element-id]"],
        "script_patterns": [r"workday\.com"],
    },
    "ashby": {
        "url_patterns": [r"jobs\.ashbyhq\.com", r"ashbyhq\.com"],
        "meta_selectors": [],
        "dom_selectors": ['[class*="ashby"]', "#ashby-application"],
        "script_patterns": [r"ashbyhq\.com"],
    },
    "icims": {
        "url_patterns": [r"careers\.\S+\.icims\.com", r"icims\.com"],
        "meta_selectors": [],
        "dom_selectors": ['[class*="iCIMS"]', "#icims-app"],
        "script_patterns": [r"icims\.com"],
    },
}

# ---------------------------------------------------------------------------
# Apply-button selectors — used when page_type == "description_only"
# ---------------------------------------------------------------------------

APPLY_BUTTON_SELECTORS = [
    'a[href*="apply"]',
    'button:has-text("Apply Now")',
    'button:has-text("Apply")',
    'a:has-text("Apply Now")',
    'a:has-text("Easy Apply")',
    'button:has-text("Quick Apply")',
    '[data-qa="apply-button"]',
    '[data-testid*="apply"]',
    '#apply-button',
    '.apply-button',
]


@dataclass
class PageContext:
    platform: ATS_PLATFORM = "generic"
    page_type: PAGE_TYPE = "description_only"
    apply_button_selector: str | None = None
    form_count: int = 0
    visible_field_count: int = 0
    snapshot_url: str = ""


# ---------------------------------------------------------------------------
# Core detection functions
# ---------------------------------------------------------------------------

async def detect_ats_platform(page: Page) -> ATS_PLATFORM:
    """Classify the ATS platform from URL + DOM signals."""
    url = page.url or ""

    for platform, signals in _ATS_SIGNALS.items():
        # 1. URL match
        for pat in signals["url_patterns"]:
            if re.search(pat, url, re.IGNORECASE):
                return platform  # type: ignore[return-value]

        # 2. DOM selector match
        for sel in signals["dom_selectors"]:
            try:
                el = await page.query_selector(sel)
                if el:
                    return platform  # type: ignore[return-value]
            except Exception:
                pass

        # 3. Script src match
        try:
            scripts = await page.evaluate(
                "Array.from(document.scripts).map(s => s.src)"
            )
            for pat in signals["script_patterns"]:
                if any(re.search(pat, s, re.IGNORECASE) for s in scripts):
                    return platform  # type: ignore[return-value]
        except Exception:
            pass

    return "generic"


async def detect_page_type(page: Page) -> tuple[PAGE_TYPE, str | None, int, int]:
    """
    Returns (page_type, apply_button_selector, form_count, visible_field_count).

    Logic:
      - Count visible input/select/textarea elements.
      - If ≥ 3 → "form" (the application form is already on the page).
      - If 1-2 → check if any APPLY button exists → "description_only".
      - If a multi-step wizard pattern is detected → "multi_step".
    """
    try:
        visible_fields = await page.evaluate("""
            () => {
                const els = Array.from(document.querySelectorAll('input, select, textarea'));
                return els.filter(el => {
                    if (el.type === 'hidden') return false;
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }).length;
            }
        """)
    except Exception:
        visible_fields = 0

    try:
        form_count = await page.evaluate(
            "document.querySelectorAll('form').length"
        )
    except Exception:
        form_count = 0

    # Check for multi-step wizard patterns (progress bars, step indicators)
    multi_step = False
    multi_step_selectors = [
        '[class*="step-indicator"]', '[class*="progress-step"]',
        '[data-step]', '[aria-current="step"]',
        '[class*="wizard"]', '[class*="multi-step"]',
    ]
    for sel in multi_step_selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                multi_step = True
                break
        except Exception:
            pass

    if multi_step:
        return "multi_step", None, form_count, visible_fields

    if visible_fields >= 3:
        return "form", None, form_count, visible_fields

    # Likely a description page — look for an Apply button
    apply_sel = None
    for sel in APPLY_BUTTON_SELECTORS:
        try:
            el = await page.query_selector(sel)
            if el:
                is_visible = await el.is_visible()
                if is_visible:
                    apply_sel = sel
                    break
        except Exception:
            pass

    return "description_only", apply_sel, form_count, visible_fields


async def analyze_page(page: Page) -> PageContext:
    """Full pre-flight analysis. Returns a PageContext."""
    platform = await detect_ats_platform(page)
    page_type, apply_sel, form_count, field_count = await detect_page_type(page)

    return PageContext(
        platform=platform,
        page_type=page_type,
        apply_button_selector=apply_sel,
        form_count=form_count,
        visible_field_count=field_count,
        snapshot_url=page.url or "",
    )
