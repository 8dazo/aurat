"""
openrouter.py — OpenRouter LLM client via LangChain ChatOpenAI.

Replaces the Ollama local+cloud client. Provides:
  - get_llm(): returns a ChatOpenAI instance for browser-use and general use
  - extract_structured(): structured extraction (used by memory, profile, JD)
  - complete(): plain text completion (used by hybrid store reranker)
"""

from __future__ import annotations

import asyncio
import json
import os
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
OPENROUTER_MODEL = os.environ.get(
    "OPENROUTER_MODEL", "liquid/lfm-2.5-1.2b-thinking:free"
)


def get_llm(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    temperature: float = 0,
    **kwargs,
) -> ChatOpenAI:
    return ChatOpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key or OPENROUTER_API_KEY,
        model=model or OPENROUTER_MODEL,
        temperature=temperature,
        default_headers={
            "HTTP-Referer": "https://aurat.ai",
            "X-Title": "Aurat Auto-Apply Agent",
        },
        **kwargs,
    )


async def extract_structured(
    prompt: str,
    schema: type[BaseModel],
    text: str = "",
    model: Optional[str] = None,
) -> BaseModel:
    llm = get_llm(model=model, temperature=0)
    full_prompt = f"{prompt}\n\n{text}" if text else prompt
    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    structured_prompt = (
        f"{full_prompt}\n\n"
        f"Respond with ONLY valid JSON matching this schema. No markdown fences.\n"
        f"Schema:\n{schema_json}"
    )
    response = await asyncio.to_thread(lambda: llm.invoke(structured_prompt))
    raw = response.content if hasattr(response, "content") else str(response)
    if "```json" in raw:
        json_str = raw.split("```json")[-1].split("```")[0]
    elif "```" in raw:
        json_str = raw.split("```")[1].split("```")[0]
    else:
        json_str = raw
    return schema.model_validate_json(json_str.strip())


async def complete(
    prompt: str,
    max_tokens: int = 200,
    model: Optional[str] = None,
) -> str:
    llm = get_llm(model=model, temperature=0, max_tokens=max_tokens)
    response = await asyncio.to_thread(lambda: llm.invoke(prompt))
    return response.content if hasattr(response, "content") else str(response)
