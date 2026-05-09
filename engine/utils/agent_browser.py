"""
agent_browser.py — Subprocess wrapper for the agent-browser CLI.
https://agent-browser.dev

agent-browser is a Rust CLI that drives Chrome via CDP and returns compact
accessibility-tree snapshots. We use it as a FALLBACK when Playwright's CSS
selector detection finds 0 fields (e.g. on heavily JS-rendered pages).

Playwright remains the primary driver. This is only invoked for detection.

Usage:
    ab = AgentBrowser()
    if await ab.is_available():
        refs = await ab.get_interactive_refs(cdp_port=9222)
        fields = ab.parse_form_refs(refs)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import shutil
from typing import Optional

logger = logging.getLogger(__name__)

_CMD = "agent-browser"


class AgentBrowser:
    """
    Thin async wrapper around the agent-browser CLI.
    Falls back gracefully if agent-browser is not installed.
    """

    def __init__(self):
        self._available: Optional[bool] = None

    async def is_available(self) -> bool:
        if self._available is None:
            self._available = shutil.which(_CMD) is not None
            if not self._available:
                logger.debug("agent-browser not found in PATH — fallback disabled")
        return self._available

    async def _run(self, *args: str, cdp_port: Optional[int] = None) -> str:
        """Run an agent-browser command and return stdout."""
        cmd = [_CMD]
        if cdp_port:
            cmd += ["--cdp", str(cdp_port)]
        cmd += list(args)
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=20.0)
            out = stdout.decode("utf-8", errors="replace").strip()
            if proc.returncode != 0:
                logger.debug("agent-browser stderr: %s", stderr.decode()[:200])
            return out
        except asyncio.TimeoutError:
            logger.warning("agent-browser command timed out: %s", args)
            return ""
        except Exception as e:
            logger.warning("agent-browser error: %s", e)
            return ""

    async def snapshot(self, cdp_port: int) -> str:
        """
        Get an accessibility-tree snapshot of the current page.
        Returns compact text like:
          @e1 [heading] "Job Title"
          @e3 [textbox] "First Name" (required)
          @e7 [button] "Submit Application"
        """
        return await self._run("snapshot", "-i", cdp_port=cdp_port)

    async def get_interactive_refs(self, cdp_port: int) -> list[dict]:
        """
        Parse the snapshot and return a list of interactive elements:
        [{ref, role, name, required}]
        """
        snap = await self.snapshot(cdp_port)
        return self.parse_snapshot(snap)

    @staticmethod
    def parse_snapshot(snapshot_text: str) -> list[dict]:
        """
        Parse agent-browser snapshot text into structured element dicts.
        Example line: - textbox "First Name" [ref=e3] (required)
        """
        refs = []
        # Pattern: optional bullet, role, quoted name, [ref=eN], optional flags
        pattern = re.compile(
            r"(?:^|\s)"
            r"(?P<ref>@e\d+)\s+"
            r"\[(?P<role>[^\]]+)\]\s+"
            r"\"(?P<name>[^\"]*)\""
            r"(?P<flags>[^\n]*)",
            re.MULTILINE,
        )
        for m in pattern.finditer(snapshot_text):
            refs.append(
                {
                    "ref": m.group("ref"),
                    "role": m.group("role").strip(),
                    "name": m.group("name").strip(),
                    "required": "required" in m.group("flags").lower(),
                }
            )
        return refs

    @staticmethod
    def parse_form_refs(refs: list[dict]) -> list[dict]:
        """
        Filter refs to likely form fields (inputs, selects, textboxes, etc.)
        and return in a format compatible with AutoApplyAgent.detect_form_fields().
        """
        form_roles = {
            "textbox", "searchbox", "combobox", "listbox",
            "checkbox", "radio", "spinbutton", "slider",
        }
        fields = []
        for r in refs:
            role = r.get("role", "").lower()
            if role in form_roles:
                field_type = {
                    "textbox": "text",
                    "searchbox": "text",
                    "combobox": "select",
                    "listbox": "select",
                    "checkbox": "checkbox",
                    "radio": "radio",
                    "spinbutton": "number",
                    "slider": "range",
                }.get(role, "text")
                fields.append(
                    {
                        "label": r["name"],
                        "type": field_type,
                        "element": None,  # no Playwright handle
                        "id": r["ref"],
                        "name": r["ref"],
                        "options": [],
                        "agent_browser_ref": r["ref"],  # flag for fill dispatch
                    }
                )
        return fields

    async def fill_by_ref(self, ref: str, value: str, cdp_port: int) -> bool:
        """Fill a form field identified by an accessibility ref."""
        out = await self._run("fill", ref, value, cdp_port=cdp_port)
        return "error" not in out.lower()

    async def click_by_ref(self, ref: str, cdp_port: int) -> bool:
        """Click an element identified by an accessibility ref."""
        out = await self._run("click", ref, cdp_port=cdp_port)
        return "error" not in out.lower()

    async def wait_for_load(self, cdp_port: int, condition: str = "networkidle") -> None:
        """Wait for a load condition."""
        await self._run("wait", "--load", condition, cdp_port=cdp_port)
