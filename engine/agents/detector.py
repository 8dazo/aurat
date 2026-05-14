"""
detector.py — Lightweight ATS platform detection from URL patterns.

Identifies which ATS platform a page belongs to based on URL patterns only.
No Playwright/DOM dependency — works without a browser instance.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ATS_PLATFORM = Literal["greenhouse", "lever", "workday", "ashby", "icims", "generic"]

_ATS_URL_PATTERNS: dict[str, list[str]] = {
    "greenhouse": [r"greenhouse\.io", r"grnh\.se"],
    "lever": [r"jobs\.lever\.co", r"lever\.co/apply"],
    "workday": [r"myworkdayjobs\.com", r"wd\d+\.myworkdayjobs"],
    "ashby": [r"jobs\.ashbyhq\.com", r"ashbyhq\.com"],
    "icims": [r"careers\.\S+\.icims\.com", r"icims\.com"],
}


@dataclass
class PageContext:
    platform: ATS_PLATFORM = "generic"
    page_type: str = "form"
    visible_field_count: int = 0
    form_count: int = 0
    snapshot_url: str = ""


def detect_ats_platform_url(url: str) -> ATS_PLATFORM:
    """Classify the ATS platform from URL only."""
    for platform, patterns in _ATS_URL_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, url, re.IGNORECASE):
                return platform  # type: ignore[return-value]
    return "generic"


def analyze_page_url(url: str) -> PageContext:
    """Full pre-flight analysis from URL only (no browser needed)."""
    platform = detect_ats_platform_url(url)
    return PageContext(
        platform=platform,
        page_type="form",
        visible_field_count=0,
        form_count=0,
        snapshot_url=url,
    )
