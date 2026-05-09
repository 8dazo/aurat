"""
collections.py — Three memory collections for Aurat, QMD-style.

Collections:
  qna_memory       — Custom job application Q&A pairs
  profile_facts    — Extracted facts about the candidate
  job_interactions — Jobs applied, companies, outcomes

Each collection has a QMD-style "context description" that is prepended
to queries for better disambiguation (a core QMD feature).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import aiosqlite

from memory.hybrid_store import HybridStore, MemoryResult, get_store

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get(
    "AURAT_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "aurat.db"),
)

# ---------------------------------------------------------------------------
# Collection context descriptions (QMD-style: improves LLM disambiguation)
# ---------------------------------------------------------------------------

COLLECTION_CONTEXTS = {
    "qna_memory": (
        "Answers to custom job application questions — includes questions about "
        "work style, motivation, salary, location, experience, and values."
    ),
    "profile_facts": (
        "Extracted facts about the candidate's skills, experience, preferences, "
        "and personal background for job applications."
    ),
    "job_interactions": (
        "History of jobs applied to, companies, job titles, application status, "
        "and notes about each application."
    ),
}


def _doc_id(collection: str, key: str) -> str:
    return hashlib.sha256(f"{collection}:{key}".encode()).hexdigest()[:24]


# ---------------------------------------------------------------------------
# MemoryCollections
# ---------------------------------------------------------------------------


class MemoryCollections:
    """
    High-level API over HybridStore for Aurat's three memory collections.

    The context description is prepended to the query before retrieval,
    matching QMD's context-steering feature.
    """

    def __init__(self):
        self._store: HybridStore = get_store()

    def _with_context(self, collection: str, query: str) -> str:
        ctx = COLLECTION_CONTEXTS.get(collection, "")
        if ctx:
            return f"[Context: {ctx}]\n\nQuery: {query}"
        return query

    # ------------------------------------------------------------------
    # QnA Memory
    # ------------------------------------------------------------------

    async def save_qna(
        self,
        question: str,
        answer: str,
        job_url: str = "",
        company: str = "",
        application_id: int = 0,
    ) -> None:
        """
        Save a Q&A pair to both:
          1. memory_documents (for semantic search)
          2. custom_qna_memory (for exact/hash lookup — backward compat)
        """
        q_hash = hashlib.sha256(question.lower().strip().encode()).hexdigest()[:16]
        doc_id = _doc_id("qna_memory", q_hash)

        # Content is "question\nanswer" for joint embedding
        content = f"Question: {question}\nAnswer: {answer}"
        metadata = {
            "question": question,
            "answer": answer,
            "job_url": job_url,
            "company": company,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await self._store.save("qna_memory", doc_id, content, metadata)

        # Also persist to SQLite QnA table (existing path for hash lookups)
        db = await aiosqlite.connect(DB_PATH)
        try:
            await db.execute(
                """INSERT OR REPLACE INTO custom_qna_memory
                   (question_hash, question, answer, application_id)
                   VALUES (?, ?, ?, ?)""",
                [q_hash, question, answer, application_id],
            )
            await db.commit()
        finally:
            await db.close()

        logger.info("Saved QnA for: %s", question[:60])

    async def search_qna(
        self, question: str, top_k: int = 3
    ) -> list[MemoryResult]:
        """
        Hybrid semantic search for best past answer to a question.
        Returns results sorted by relevance (highest score first).
        """
        query = self._with_context("qna_memory", question)
        results = await self._store.search("qna_memory", query, top_k=top_k)
        return results

    async def best_qna_answer(self, question: str, min_score: float = 0.4) -> Optional[str]:
        """
        Convenience: returns the best-matching answer string or None.
        min_score threshold prevents garbage matches.
        """
        results = await self.search_qna(question, top_k=1)
        if results and results[0].score >= min_score:
            return results[0].metadata.get("answer")
        return None

    # ------------------------------------------------------------------
    # Profile Facts
    # ------------------------------------------------------------------

    async def save_fact(
        self,
        fact: str,
        category: str,
        confidence: int,
        source_job_url: str = "",
        source_question: str = "",
    ) -> None:
        """
        Save a profile fact to:
          1. memory_documents (for semantic retrieval)
          2. profile_facts table (for structured queries by category/confidence)
        """
        doc_id = _doc_id("profile_facts", fact)
        metadata = {
            "fact": fact,
            "category": category,
            "confidence": confidence,
            "source_job_url": source_job_url,
            "source_question": source_question,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await self._store.save("profile_facts", doc_id, fact, metadata)

        db = await aiosqlite.connect(DB_PATH)
        try:
            await db.execute(
                """INSERT OR REPLACE INTO profile_facts
                   (fact, category, confidence, source_job_url, source_question)
                   VALUES (?, ?, ?, ?, ?)""",
                [fact, category, confidence, source_job_url, source_question],
            )
            await db.commit()
        finally:
            await db.close()

    async def search_facts(
        self, topic: str, top_k: int = 5
    ) -> list[MemoryResult]:
        """Hybrid search over profile facts."""
        query = self._with_context("profile_facts", topic)
        return await self._store.search("profile_facts", query, top_k=top_k)

    async def get_all_facts(
        self, min_confidence: int = 50
    ) -> list[dict]:
        """Return structured facts from the profile_facts table."""
        db = await aiosqlite.connect(DB_PATH)
        try:
            async with db.execute(
                "SELECT fact, category, confidence, source_job_url, created_at "
                "FROM profile_facts WHERE confidence >= ? "
                "ORDER BY confidence DESC",
                [min_confidence],
            ) as cur:
                rows = await cur.fetchall()
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, row)) for row in rows]
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Job Interactions
    # ------------------------------------------------------------------

    async def save_job_interaction(
        self,
        job_url: str,
        company: str,
        title: str,
        status: str,
        notes: str = "",
        custom_questions: Optional[list[dict]] = None,
    ) -> None:
        doc_id = _doc_id("job_interactions", job_url)
        content = (
            f"Company: {company}\n"
            f"Title: {title}\n"
            f"Status: {status}\n"
            f"Notes: {notes}"
        )
        if custom_questions:
            qa_text = "\n".join(
                f"Q: {q.get('question','')} A: {q.get('answer','')}"
                for q in custom_questions
            )
            content += f"\nCustom Q&A:\n{qa_text}"

        metadata = {
            "job_url": job_url,
            "company": company,
            "title": title,
            "status": status,
            "notes": notes,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await self._store.save("job_interactions", doc_id, content, metadata)

    async def search_jobs(self, query: str, top_k: int = 5) -> list[MemoryResult]:
        ctx_query = self._with_context("job_interactions", query)
        return await self._store.search("job_interactions", ctx_query, top_k=top_k)

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    async def status(self) -> dict:
        store_status = await self._store.status()
        return {
            "collections": store_status,
            "contexts": {k: v[:60] + "…" for k, v in COLLECTION_CONTEXTS.items()},
        }
