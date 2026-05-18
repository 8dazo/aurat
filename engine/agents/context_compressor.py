"""
context_compressor.py — Rolling summary context compression for AuratAgent.
Provides progressive summarization to reduce token overhead during long multi-step runs.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class ContextCompressor:
    """
    Compresses rolling agent history by compiling completed tasks
    into a concise summary and trimming the detailed history.
    """

    def __init__(self, max_keep: int = 5):
        self.max_keep = max_keep

    def get_summary(self, steps: list[dict]) -> str:
        """
        Summarize old completed steps to fit them cleanly into the LLM context.
        Keeps only the last `max_keep` steps in full detail.
        """
        if len(steps) <= self.max_keep:
            return ""

        old_steps = steps[:-self.max_keep]
        summary_lines = []
        summary_lines.append("COMPLETED SO FAR:")

        for s in old_steps:
            step_name = s.get("step", "Unknown Step")
            status = s.get("status", "info")
            detail = s.get("detail", "")
            
            # Extract main action/detail
            if detail:
                brief = detail.split("→")[0].strip()  # get action without URL suffix
            else:
                brief = status

            summary_lines.append(f"  ✓ {step_name}: {brief[:60]}")

        summary_lines.append("---")
        return "\n".join(summary_lines)
