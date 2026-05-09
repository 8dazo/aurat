"""
hybrid_store.py — QMD-pattern hybrid retrieval engine.

Pipeline (mirrors github.com/tobi/qmd):
  Stage 1: BM25 (rank-bm25)  +  Vector (sentence-transformers)
  Stage 2: Reciprocal Rank Fusion (RRF, k=60)
           - Original query gets ×2 weight
           - Top-rank bonus: #1 → +0.05, #2-3 → +0.02
  Stage 3: LLM Cross-Encoder Reranking (Ollama)
           - Position-aware blend:
               Top 1-3  → 75% RRF / 25% reranker
               Top 4-10 → 60% RRF / 40% reranker
               Top 11+  → 40% RRF / 60% reranker

Storage: SQLite aurat.db (memory_documents table).
Embeddings serialised as struct-packed float32 blobs.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import struct
from dataclasses import dataclass, field
from typing import Optional

import aiosqlite
import numpy as np

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get(
    "AURAT_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "aurat.db"),
)

# ---------------------------------------------------------------------------
# Lazy-loaded sentence-transformer (loaded once, reused)
# ---------------------------------------------------------------------------

_embedder = None
_embedder_lock = asyncio.Lock()
_EMBED_MODEL = "all-MiniLM-L6-v2"  # 80 MB, CPU fast, 384-dim


async def _get_embedder():
    global _embedder
    async with _embedder_lock:
        if _embedder is None:
            logger.info("Loading embedding model %s …", _EMBED_MODEL)
            from sentence_transformers import SentenceTransformer

            # Run in executor to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            _embedder = await loop.run_in_executor(
                None, SentenceTransformer, _EMBED_MODEL
            )
            logger.info("Embedding model loaded.")
    return _embedder


async def embed_text(text: str) -> np.ndarray:
    model = await _get_embedder()
    loop = asyncio.get_event_loop()
    vec = await loop.run_in_executor(None, model.encode, text)
    return vec.astype(np.float32)


def _pack_embedding(vec: np.ndarray) -> bytes:
    return struct.pack(f"{len(vec)}f", *vec.tolist())


def _unpack_embedding(blob: bytes) -> np.ndarray:
    n = len(blob) // 4
    return np.array(struct.unpack(f"{n}f", blob), dtype=np.float32)


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------


@dataclass
class MemoryResult:
    doc_id: str
    content: str
    metadata: dict
    collection: str
    score: float = 0.0
    rrf_score: float = 0.0
    rerank_score: Optional[float] = None


# ---------------------------------------------------------------------------
# BM25 retriever (in-memory, rebuilt per query from DB documents)
# ---------------------------------------------------------------------------


class BM25Retriever:
    """Lightweight BM25 over a list of documents."""

    def __init__(self, docs: list[dict]):
        from rank_bm25 import BM25Okapi

        self._docs = docs
        tokenized = [d["content"].lower().split() for d in docs]
        self._bm25 = BM25Okapi(tokenized)

    def search(self, query: str, top_k: int = 20) -> list[tuple[int, float]]:
        """Returns list of (doc_index, score) sorted desc."""
        tokens = query.lower().split()
        scores = self._bm25.get_scores(tokens)
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [(idx, float(sc)) for idx, sc in ranked[:top_k] if sc > 0]


# ---------------------------------------------------------------------------
# RRF Fusion
# ---------------------------------------------------------------------------

_RRF_K = 60
_TOP1_BONUS = 0.05
_TOP23_BONUS = 0.02


def _rrf_fuse(
    ranked_lists: list[list[tuple[str, float]]],
    weights: Optional[list[float]] = None,
) -> dict[str, float]:
    """
    Reciprocal Rank Fusion across multiple ranked lists.
    ranked_lists: each is [(doc_id, score), …] sorted best-first.
    weights: per-list multiplier (default 1.0 each).
    Returns: {doc_id: rrf_score}
    """
    if weights is None:
        weights = [1.0] * len(ranked_lists)

    rrf: dict[str, float] = {}
    for w, ranked in zip(weights, ranked_lists):
        for rank, (doc_id, _) in enumerate(ranked):
            base = w / (_RRF_K + rank + 1)
            # Top-rank bonus
            if rank == 0:
                base += _TOP1_BONUS
            elif rank <= 2:
                base += _TOP23_BONUS
            rrf[doc_id] = rrf.get(doc_id, 0.0) + base

    return rrf


# ---------------------------------------------------------------------------
# Core HybridStore
# ---------------------------------------------------------------------------


class HybridStore:
    """
    QMD-pattern hybrid store backed by SQLite.

    Usage:
        store = HybridStore()
        await store.save("qna_memory", doc_id, content, metadata)
        results = await store.search("qna_memory", "teamwork question", top_k=5)
    """

    async def _db(self):
        return await aiosqlite.connect(DB_PATH)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def save(
        self,
        collection: str,
        doc_id: str,
        content: str,
        metadata: dict,
    ) -> None:
        """Upsert a document (+ embedding) into the store."""
        vec = await embed_text(content)
        blob = _pack_embedding(vec)
        meta_json = json.dumps(metadata)

        db = await self._db()
        try:
            await db.execute(
                """INSERT OR REPLACE INTO memory_documents
                   (id, collection, content, metadata, embedding, updated_at)
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                [doc_id, collection, content, meta_json, blob],
            )
            await db.commit()
        finally:
            await db.close()

    async def delete(self, doc_id: str) -> None:
        db = await self._db()
        try:
            await db.execute("DELETE FROM memory_documents WHERE id = ?", [doc_id])
            await db.commit()
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    async def _load_collection(self, collection: str) -> list[dict]:
        db = await self._db()
        try:
            async with db.execute(
                "SELECT id, content, metadata, embedding FROM memory_documents "
                "WHERE collection = ?",
                [collection],
            ) as cur:
                rows = await cur.fetchall()
        finally:
            await db.close()

        docs = []
        for row in rows:
            doc_id, content, meta_json, blob = row
            docs.append(
                {
                    "id": doc_id,
                    "content": content,
                    "metadata": json.loads(meta_json),
                    "embedding": _unpack_embedding(blob) if blob else None,
                }
            )
        return docs

    async def count(self, collection: str) -> int:
        db = await self._db()
        try:
            async with db.execute(
                "SELECT COUNT(*) FROM memory_documents WHERE collection = ?",
                [collection],
            ) as cur:
                row = await cur.fetchone()
                return row[0] if row else 0
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Search — Stage 1+2: BM25 + Vector + RRF
    # ------------------------------------------------------------------

    async def search(
        self,
        collection: str,
        query: str,
        top_k: int = 5,
        rerank: bool = True,
    ) -> list[MemoryResult]:
        docs = await self._load_collection(collection)
        if not docs:
            return []

        query_vec = await embed_text(query)

        # ── Stage 1a: BM25 keyword search ─────────────────────────────
        bm25 = BM25Retriever(docs)
        bm25_hits = bm25.search(query, top_k=20)
        bm25_ranked = [(docs[idx]["id"], score) for idx, score in bm25_hits]

        # ── Stage 1b: Vector semantic search ──────────────────────────
        vec_scores: list[tuple[str, float]] = []
        for doc in docs:
            if doc["embedding"] is not None:
                sim = _cosine_sim(query_vec, doc["embedding"])
                vec_scores.append((doc["id"], sim))
        vec_ranked = sorted(vec_scores, key=lambda x: x[1], reverse=True)[:20]

        # ── Stage 2: RRF Fusion ────────────────────────────────────────
        # Original query gets ×2 weight (QMD pattern)
        rrf = _rrf_fuse([bm25_ranked, vec_ranked], weights=[2.0, 1.0])
        top_ids = sorted(rrf, key=lambda k: rrf[k], reverse=True)[:30]

        # Build result objects
        doc_map = {d["id"]: d for d in docs}
        results: list[MemoryResult] = []
        for doc_id in top_ids:
            if doc_id not in doc_map:
                continue
            d = doc_map[doc_id]
            results.append(
                MemoryResult(
                    doc_id=doc_id,
                    content=d["content"],
                    metadata=d["metadata"],
                    collection=collection,
                    rrf_score=rrf[doc_id],
                    score=rrf[doc_id],
                )
            )

        if not rerank or len(results) <= 1:
            return results[:top_k]

        # ── Stage 3: LLM Cross-Encoder Reranking ──────────────────────
        results = await self._rerank(query, results, top_k=top_k)
        return results

    # ------------------------------------------------------------------
    # Reranker — QMD position-aware blend
    # ------------------------------------------------------------------

    async def _rerank(
        self,
        query: str,
        results: list[MemoryResult],
        top_k: int,
    ) -> list[MemoryResult]:
        """
        Ask Ollama to score relevance for each candidate.
        Position-aware blend:
          RRF rank 1-3  → 75% RRF / 25% reranker
          RRF rank 4-10 → 60% RRF / 40% reranker
          RRF rank 11+  → 40% RRF / 60% reranker
        """
        try:
            from llm.client import LLMClient

            llm = LLMClient()

            # Score each candidate (in batches to be efficient)
            candidates = results[:min(len(results), 10)]
            reranked = []
            for i, res in enumerate(candidates):
                prompt = (
                    f"Query: {query}\n\n"
                    f"Document: {res.content[:400]}\n\n"
                    "Is this document relevant to the query? Answer YES or NO."
                )
                try:
                    answer = await llm.complete(prompt, max_tokens=5)
                    rerank_score = 1.0 if "yes" in answer.lower() else 0.0
                except Exception:
                    rerank_score = 0.5  # neutral if LLM unavailable

                res.rerank_score = rerank_score

                # Position-aware blend
                rrf_rank = i  # 0-indexed
                if rrf_rank < 3:
                    w_rrf, w_rr = 0.75, 0.25
                elif rrf_rank < 10:
                    w_rrf, w_rr = 0.60, 0.40
                else:
                    w_rrf, w_rr = 0.40, 0.60

                res.score = w_rrf * res.rrf_score + w_rr * rerank_score
                reranked.append(res)

            # Remaining results (not sent to reranker) keep RRF score
            reranked.extend(results[len(candidates) :])
            reranked.sort(key=lambda r: r.score, reverse=True)
            return reranked[:top_k]

        except Exception as e:
            logger.warning("Reranker failed, using RRF scores only: %s", e)
            return results[:top_k]

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    async def status(self) -> dict:
        db = await self._db()
        try:
            async with db.execute(
                "SELECT collection, COUNT(*) FROM memory_documents GROUP BY collection"
            ) as cur:
                rows = await cur.fetchall()
        finally:
            await db.close()
        return {row[0]: row[1] for row in rows}


# Singleton
_store: Optional[HybridStore] = None


def get_store() -> HybridStore:
    global _store
    if _store is None:
        _store = HybridStore()
    return _store
