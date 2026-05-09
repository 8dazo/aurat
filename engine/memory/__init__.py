"""
memory/ — QMD-inspired hybrid memory engine for Aurat.

Architecture mirrors QMD (github.com/tobi/qmd):
  1. BM25 keyword search  (rank-bm25)
  2. Vector semantic search (sentence-transformers)
  3. RRF Fusion  (Reciprocal Rank Fusion, k=60, original query ×2)
  4. LLM Reranking  (Ollama cross-encoder, position-aware blend)

All storage is SQLite (reuses aurat.db) — no external services required.
"""

from memory.collections import MemoryCollections
from memory.profile_builder import ProfileBuilder

__all__ = ["MemoryCollections", "ProfileBuilder"]
