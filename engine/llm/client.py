"""
llm/client.py — LLM client backed by OpenRouter.

Replaces the Ollama local+cloud client.
Preserves the extract_structured() and complete() interfaces
used by memory, profile builder, and JD analyzer.
"""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class LLMClient:
    """LLM client backed by OpenRouter via the llm.openrouter module."""

    def __init__(self):
        from llm.openrouter import get_llm

        self._get_llm = get_llm

    async def extract_structured(
        self,
        prompt: str,
        schema: type[BaseModel],
        text: str = "",
        model: Optional[str] = None,
    ) -> BaseModel:
        from llm.openrouter import extract_structured

        return await extract_structured(prompt, schema, text, model=model)

    async def complete(
        self, prompt: str, max_tokens: int = 200, model: Optional[str] = None
    ) -> str:
        from llm.openrouter import complete

        return await complete(prompt, max_tokens=max_tokens, model=model)
