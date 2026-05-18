"""
answer_resolver.py — Automated resolution of custom application questions.

Uses exact matching, synonym lookup, and heuristics to resolve custom ATS form
questions before asking the candidate for manual input.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


class AnswerResolver:
    """
    Tries to auto-resolve custom application questions from candidate profile
    and metadata using synonym mapping, keyword heuristics, and past Q&A memory.
    """

    def __init__(self, profile: dict):
        self.profile = profile

    async def resolve(self, question: str) -> Optional[str]:
        """
        Attempt to resolve the question. Returns the answer string if resolved,
        else None.
        """
        q = question.lower().strip()

        # 1. Exact/Close check in past QnA memory
        custom_qna = self.profile.get("custom_qna_memory", {})
        for saved_q, ans in custom_qna.items():
            if saved_q.lower().strip() in q or q in saved_q.lower().strip():
                return ans

        # 2. Heuristics for typical ATS questions
        
        # Sponsorship / Visa
        if "sponsorship" in q or "sponsor" in q or "authorized to work" in q or "visa" in q:
            requires_sponsorship = self.profile.get("inferred_traits", {}).get("requires_sponsorship")
            if requires_sponsorship is not None:
                # Format Yes/No properly based on question direction
                if "will you now or in the future require" in q or "require sponsorship" in q:
                    return "Yes" if requires_sponsorship else "No"
                elif "authorized to work" in q or "legally authorized" in q:
                    return "No" if requires_sponsorship else "Yes"

        # Relocation
        if "relocate" in q or "willing to relocate" in q:
            willing_to_relocate = self.profile.get("inferred_traits", {}).get("willing_to_relocate")
            if willing_to_relocate is not None:
                return "Yes" if willing_to_relocate else "No"

        # Notice Period / Availability
        if "notice period" in q or "how soon can you start" in q or "start date" in q or "availability" in q:
            notice = self.profile.get("personal_info", {}).get("notice_period")
            if notice:
                return str(notice)
            return "Immediate"

        # Salary expectations
        if "salary" in q or "compensation" in q or "expectations" in q:
            salary = self.profile.get("personal_info", {}).get("salary_expectation")
            if salary:
                return str(salary)

        # Clearances
        if "clearance" in q or "security clearance" in q:
            clearance = self.profile.get("inferred_traits", {}).get("clearance")
            if clearance:
                return str(clearance)
            return "None / No clearance"

        # Gender / Ethnicity / Veteran / Disability standard EEOC fallbacks
        if "gender" in q or "sex" in q:
            return "Decline to Self-Identify"
        if "race" in q or "ethnicity" in q:
            return "Decline to Self-Identify"
        if "veteran" in q:
            return "I am not a veteran"
        if "disability" in q:
            return "No, I don't have a disability"

        # 3. Fallback semantic memory lookup if the collections store is available
        try:
            from memory.collections import MemoryCollections
            mem = MemoryCollections()
            ans = await mem.best_qna_answer(question, min_score=0.35)
            if ans:
                return ans
        except Exception as e:
            logger.debug("Failed semantic lookup inside AnswerResolver: %s", e)

        return None
