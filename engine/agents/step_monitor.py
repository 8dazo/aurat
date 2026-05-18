"""
step_monitor.py — Runtime loop and stall detection for AuratAgent.

Tracks actions at each browser-use step and detects:
  - Action loops: same (action_type, target) repeated 3+ times in last 8 steps
  - Page stalls: same URL + no new fields filled for 6+ consecutive steps
  - Overall step budget: warns when approaching max_steps

Usage:
    monitor = StepMonitor(max_steps=40)
    monitor.record(action_key="ClickElement:button#submit", current_url="https://...")
    if monitor.is_looping():
        logger.warning(monitor.loop_description())
"""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class StepRecord:
    step_num: int
    action_key: str       # e.g. "InputText:input#email"
    current_url: str
    new_field_filled: bool = False


class StepMonitor:
    """
    Tracks agent steps at runtime to detect loops and stalling.

    Attach to the browser-use on_step callback:
        monitor = StepMonitor(max_steps=40)
        monitor.record(action_key, current_url, new_field_filled)
        if monitor.is_looping():
            # inject corrective context or abort
    """

    LOOP_WINDOW = 8        # look back this many steps for repeat actions
    LOOP_THRESHOLD = 3     # same action_key N times in window = loop
    STALL_WINDOW = 6       # consecutive steps on same URL with no new fields = stall

    def __init__(self, max_steps: int = 40):
        self.max_steps = max_steps
        self._steps: deque[StepRecord] = deque(maxlen=max(self.LOOP_WINDOW, self.STALL_WINDOW) + 2)
        self._step_count = 0
        self._loop_flag: Optional[str] = None
        self._stall_flag: Optional[str] = None

    def record(
        self,
        action_key: str,
        current_url: str,
        new_field_filled: bool = False,
    ) -> None:
        """Record a step and update loop/stall detection."""
        self._step_count += 1
        rec = StepRecord(
            step_num=self._step_count,
            action_key=action_key,
            current_url=current_url,
            new_field_filled=new_field_filled,
        )
        self._steps.append(rec)
        self._loop_flag = self._detect_loop()
        self._stall_flag = self._detect_stall()

    def _detect_loop(self) -> Optional[str]:
        """Return loop description if detected, else None."""
        window = list(self._steps)[-self.LOOP_WINDOW:]
        if len(window) < self.LOOP_THRESHOLD:
            return None
        # Count occurrences of each action key in window
        counts: dict[str, int] = {}
        for rec in window:
            counts[rec.action_key] = counts.get(rec.action_key, 0) + 1
        for key, count in counts.items():
            if count >= self.LOOP_THRESHOLD:
                return f"Repeated action '{key}' {count}× in last {len(window)} steps"
        return None

    def _detect_stall(self) -> Optional[str]:
        """Return stall description if agent is stuck on same page with no progress."""
        window = list(self._steps)[-self.STALL_WINDOW:]
        if len(window) < self.STALL_WINDOW:
            return None
        # All same URL and no new fields filled
        urls = {r.current_url for r in window}
        any_progress = any(r.new_field_filled for r in window)
        if len(urls) == 1 and not any_progress:
            return f"Stalled on {list(urls)[0]} for {len(window)} steps with no new fields filled"
        return None

    def is_looping(self) -> bool:
        return self._loop_flag is not None

    def is_stalled(self) -> bool:
        return self._stall_flag is not None

    def is_stuck(self) -> bool:
        return self.is_looping() or self.is_stalled()

    def loop_description(self) -> str:
        return self._loop_flag or ""

    def stall_description(self) -> str:
        return self._stall_flag or ""

    def stuck_description(self) -> str:
        """Return human-readable stuck reason for logging/WS broadcast."""
        parts = []
        if self._loop_flag:
            parts.append(f"LOOP: {self._loop_flag}")
        if self._stall_flag:
            parts.append(f"STALL: {self._stall_flag}")
        return " | ".join(parts) if parts else ""

    def approaching_limit(self, warn_at: int = 10) -> bool:
        """True when within `warn_at` steps of max_steps."""
        return (self.max_steps - self._step_count) <= warn_at

    def reset(self) -> None:
        self._steps.clear()
        self._step_count = 0
        self._loop_flag = None
        self._stall_flag = None

    @staticmethod
    def action_key_from_model_output(model_output) -> str:
        """
        Extract a stable action key string from browser-use model output.
        Falls back to 'UnknownAction' if parsing fails.
        """
        try:
            if model_output and hasattr(model_output, "action"):
                actions = model_output.action
                if not actions:
                    return "NoAction"
                parts = []
                for action in actions[:3]:  # max 3 per step to keep key short
                    action_type = type(action).__name__
                    # Try to get a target identifier from common fields
                    target = ""
                    for attr in ("selector", "index", "url", "text", "key"):
                        val = getattr(action, attr, None)
                        if val is not None:
                            target = str(val)[:40]
                            break
                    parts.append(f"{action_type}:{target}" if target else action_type)
                return "|".join(parts)
        except Exception:
            pass
        return "UnknownAction"
