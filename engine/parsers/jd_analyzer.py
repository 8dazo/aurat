from pydantic import BaseModel, Field
from typing import Optional
from llm.client import LLMClient
from llm.prompts import MATCH_JD_PROMPT


class MatchResult(BaseModel):
    score: float = Field(ge=0, le=100, description="Match percentage 0-100")
    missing_skills: list[str] = Field(default_factory=list)
    matching_skills: list[str] = Field(default_factory=list)
    summary: Optional[str] = None


llm = LLMClient()


async def analyze_jd(profile_text: str, jd_text: str) -> MatchResult:
    prompt = f"{MATCH_JD_PROMPT}\n\nCandidate Profile:\n{profile_text}\n\nJob Description:\n{jd_text}"
    result = await llm.extract_structured(prompt, MatchResult, "")
    result.matching_skills = result.matching_skills or []
    result.missing_skills = result.missing_skills or []
    return result
