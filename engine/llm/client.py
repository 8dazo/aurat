from ollama import Client
from pydantic import BaseModel
import os, json, asyncio

CLOUD_MODEL = os.environ.get("OLLAMA_CLOUD_MODEL", "gpt-oss:120b")
LOCAL_MODEL = os.environ.get("OLLAMA_LOCAL_MODEL", "gpt-oss")


class LLMClient:
    def __init__(self):
        api_key = os.environ.get("OLLAMA_API_KEY", "")
        self.cloud = Client(
            host="https://ollama.com",
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )
        self.local = Client(host="http://localhost:11434")
        self._local_available = None

    async def _check_local(self) -> bool:
        if self._local_available is not None:
            return self._local_available
        try:
            self.local.list()
            self._local_available = True
        except Exception:
            self._local_available = False
        return self._local_available

    async def extract_structured(
        self, prompt: str, schema: type[BaseModel], text: str
    ) -> BaseModel:
        if await self._check_local():
            try:
                resp = await asyncio.to_thread(
                    self.local.chat,
                    model=LOCAL_MODEL,
                    messages=[{"role": "user", "content": f"{prompt}\n\n{text}"}],
                    format=schema.model_json_schema(),
                    options={"temperature": 0},
                )
                return schema.model_validate_json(resp.message.content)
            except Exception:
                self._local_available = False

        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        cloud_prompt = (
            f"{prompt}\n\n"
            f"Respond with ONLY valid JSON matching this schema. No markdown fences.\n"
            f"Schema:\n{schema_json}\n\n"
            f"Text:\n{text}"
        )
        resp = await asyncio.to_thread(
            self.cloud.chat,
            model=CLOUD_MODEL,
            messages=[{"role": "user", "content": cloud_prompt}],
        )
        raw = resp.message.content
        if "```json" in raw:
            json_str = raw.split("```json")[-1].split("```")[0]
        elif "```" in raw:
            json_str = raw.split("```")[1].split("```")[0]
        else:
            json_str = raw
        return schema.model_validate_json(json_str.strip())

    async def complete(self, prompt: str, max_tokens: int = 200) -> str:
        """Plain text completion — used by the memory reranker."""
        if await self._check_local():
            try:
                resp = await asyncio.to_thread(
                    self.local.chat,
                    model=LOCAL_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    options={"temperature": 0, "num_predict": max_tokens},
                )
                return resp.message.content or ""
            except Exception:
                self._local_available = False

        resp = await asyncio.to_thread(
            self.cloud.chat,
            model=CLOUD_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"num_predict": max_tokens},
        )
        return resp.message.content or ""

