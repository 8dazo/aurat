"""
openrouter.py — LLM client supporting OpenRouter and Ollama cloud models.

Provides:
  - get_llm(): returns a ChatOpenAI instance for browser-use and general use
  - extract_structured(): structured extraction (used by memory, profile, JD)
  - complete(): plain text completion (used by hybrid store reranker)

Default model: Ollama cloud (gpt-oss:120b) — free, good quality.
Set OPENROUTER_MODEL env var to use a different model (e.g. for browser-use agent).
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

LLM_BACKEND = os.environ.get("AURAT_LLM_BACKEND", "ollama").lower()

# Ollama cloud settings (free models)
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "https://ollama.com")
OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_CLOUD_MODEL = os.environ.get("OLLAMA_CLOUD_MODEL", "kimi-k2.6:cloud")
OLLAMA_LOCAL_MODEL = os.environ.get("OLLAMA_LOCAL_MODEL", "kimi-k2.6")

# OpenRouter settings
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")


def get_llm(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    temperature: float = 0,
    backend: Optional[str] = None,
    **kwargs,
) -> ChatOpenAI:
    """Get an LLM client. Defaults to Ollama cloud (free). Use backend='openrouter' for OpenRouter."""
    use_backend = (backend or LLM_BACKEND).lower()

    if use_backend == "openrouter":
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

    # Default: Ollama cloud (free models)
    headers = {}
    if api_key or OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {api_key or OLLAMA_API_KEY}"

    return ChatOpenAI(
        base_url=f"{OLLAMA_HOST}/api",
        api_key=api_key or OLLAMA_API_KEY or "ollama",
        model=model or OLLAMA_CLOUD_MODEL,
        temperature=temperature,
        **kwargs,
    )


def get_agent_llm(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    temperature: float = 0,
    **kwargs,
) -> ChatOpenAI:
    """Get LLM for browser-use agent. Uses browser-use capable model.

    Priority: OPENROUTER_MODEL env var (if OPENROUTER_API_KEY set) → Ollama cloud.
    Browser-use needs strong tool-calling models, so this defaults to
    the best available free model.
    """
    if OPENROUTER_API_KEY:
        return get_llm(
            model=model or OPENROUTER_MODEL,
            api_key=api_key or OPENROUTER_API_KEY,
            temperature=temperature,
            backend="openrouter",
            **kwargs,
        )

    # Fallback to Ollama cloud — gpt-oss:120b works for browser-use
    return get_llm(
        model=model or OLLAMA_CLOUD_MODEL,
        api_key=api_key or OLLAMA_API_KEY,
        temperature=temperature,
        backend="ollama",
        **kwargs,
    )


async def extract_structured(
    prompt: str,
    schema: type[BaseModel],
    text: str = "",
    model: Optional[str] = None,
    backend: Optional[str] = None,
) -> BaseModel:
    llm = get_llm(model=model, temperature=0, backend=backend)
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
    backend: Optional[str] = None,
) -> str:
    llm = get_llm(model=model, temperature=0, max_tokens=max_tokens, backend=backend)
    response = await asyncio.to_thread(lambda: llm.invoke(prompt))
    return response.content if hasattr(response, "content") else str(response)
