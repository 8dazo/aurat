"""
profile_builder.py — LLM-powered profile enrichment from job interactions.

After each apply session:
  1. Extract structured facts from custom Q&A answers
  2. Assign confidence scores (0-100)
  3. Save facts to memory (vector store + profile_facts table)
  4. Merge high-confidence facts back into master_profile
  5. Identify profile gaps and generate targeted user questions
"""

from __future__ import annotations

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

FACT_EXTRACTION_PROMPT = """\
You are an expert at extracting structured facts from job application Q&A answers.

Given the following Q&A pairs from a job application, extract atomic facts about the candidate.

For each fact:
- fact: a single concise statement about the candidate (max 20 words)
- category: one of [skill, experience, preference, personal, contact]
- confidence: 0-100 how confident you are this fact is accurate and relevant

Rules:
- Only extract facts that are definitively stated, not implied
- Personal preferences expressed in answers are valid facts (e.g. "prefers remote work")
- Each fact must stand alone — no context required to understand it
- Skip vague or unhelpful statements (e.g. "hard worker")
- Maximum 10 facts per Q&A session

Q&A pairs:
{qa_pairs}

Output ONLY valid JSON array:
[{{"fact": str, "category": str, "confidence": int}}]
"""

PROFILE_GAP_PROMPT = """\
You are analyzing a candidate's profile for job applications.
Identify gaps — important missing information that would help fill job applications better.

Current profile fields present:
{present_fields}

Known profile facts:
{facts}

Job context: {job_context}

For each gap you find, generate one natural conversational question to ask the user.
Output ONLY valid JSON array (max 5 questions):
[{{"field": str, "question": str, "reason": str}}]
"""

PROFILE_ENRICH_PROMPT = """\
Given these high-confidence facts about a candidate, update the profile dict by adding
or refining values. Only update fields where the fact clearly provides better/more
complete information.

Current profile (partial):
{profile}

High-confidence facts (confidence >= 80):
{facts}

Output ONLY a JSON dict of fields to update/add (merge into existing profile):
{{}}
"""


# ---------------------------------------------------------------------------
# ProfileBuilder
# ---------------------------------------------------------------------------


class ProfileBuilder:
    """
    Extracts profile facts from Q&A, saves to memory, and enriches the profile.
    """

    def __init__(self):
        from llm.client import LLMClient
        from memory.collections import MemoryCollections
        from pydantic import BaseModel
        from typing import Optional as Opt

        self._llm_module = LLMClient
        self._mem_module = MemoryCollections

    async def extract_and_save_facts(
        self,
        custom_questions: list[dict],
        job_url: str = "",
        company: str = "",
    ) -> list[dict]:
        """
        Extract facts from custom Q&A pairs and save to memory.
        Returns the list of extracted facts.
        """
        if not custom_questions:
            return []

        qa_text = "\n".join(
            f"Q: {q.get('question', '')}\nA: {q.get('answer', '')}"
            for q in custom_questions
            if q.get("answer")
        )
        if not qa_text.strip():
            return []

        from llm.client import LLMClient
        from pydantic import BaseModel
        from typing import Optional as Opt

        class Fact(BaseModel):
            fact: str
            category: str
            confidence: int

        class FactList(BaseModel):
            facts: list[Fact]

        llm = LLMClient()
        prompt = FACT_EXTRACTION_PROMPT.format(qa_pairs=qa_text)

        try:
            result = await llm.extract_structured(prompt, FactList, "[]")
            facts = result.facts
        except Exception as e:
            logger.warning("Fact extraction failed: %s", e)
            return []

        if not facts:
            return []

        # Save to memory
        from memory.collections import MemoryCollections

        mem = MemoryCollections()
        for f in facts:
            await mem.save_fact(
                fact=f.fact,
                category=f.category,
                confidence=f.confidence,
                source_job_url=job_url,
                source_question=qa_text[:200],
            )

        logger.info("Extracted %d facts from %s", len(facts), company or job_url)
        return [f.model_dump() for f in facts]

    async def enrich_profile(
        self,
        current_profile: dict,
        job_url: str = "",
        company: str = "",
    ) -> dict:
        """
        Pull high-confidence facts from memory and merge into the profile.
        Returns the (possibly enriched) profile dict.
        """
        from memory.collections import MemoryCollections
        from llm.client import LLMClient

        mem = MemoryCollections()
        facts = await mem.get_all_facts(min_confidence=80)
        if not facts:
            return current_profile

        profile_excerpt = {
            k: v
            for k, v in current_profile.items()
            if k not in ("custom_qna_memory", "resume_path")
        }
        prompt = PROFILE_ENRICH_PROMPT.format(
            profile=json.dumps(profile_excerpt, indent=2)[:1500],
            facts=json.dumps([f["fact"] for f in facts[:20]], indent=2),
        )

        llm = LLMClient()
        try:
            raw = await llm.complete(prompt, max_tokens=500)
            # Strip markdown fences if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:-1])
            updates = json.loads(raw)
            if isinstance(updates, dict):
                current_profile.update(updates)
                logger.info("Profile enriched with %d field updates", len(updates))
        except Exception as e:
            logger.warning("Profile enrichment merge failed: %s", e)

        return current_profile

    async def find_gaps_and_questions(
        self,
        current_profile: dict,
        job_context: str = "",
    ) -> list[dict]:
        """
        Identify missing profile fields and return questions to ask the user.
        Returns list of {field, question, reason}.
        """
        from memory.collections import MemoryCollections
        from llm.client import LLMClient
        from pydantic import BaseModel

        class Gap(BaseModel):
            field: str
            question: str
            reason: str

        class GapList(BaseModel):
            gaps: list[Gap]

        mem = MemoryCollections()
        facts = await mem.get_all_facts(min_confidence=60)

        present_fields = [k for k, v in current_profile.items() if v]
        prompt = PROFILE_GAP_PROMPT.format(
            present_fields=json.dumps(present_fields),
            facts=json.dumps([f["fact"] for f in facts[:15]], indent=2),
            job_context=job_context[:300],
        )

        llm = LLMClient()
        try:
            result = await llm.extract_structured(prompt, GapList, "[]")
            return [g.model_dump() for g in result.gaps]
        except Exception as e:
            logger.warning("Gap analysis failed: %s", e)
            return []
