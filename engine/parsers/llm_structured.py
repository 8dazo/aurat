from models.profile import MasterProfile
from llm.client import LLMClient
from llm.prompts import EXTRACT_RESUME_PROMPT

llm = LLMClient()


async def extract_profile(text: str) -> MasterProfile:
    return await llm.extract_structured(EXTRACT_RESUME_PROMPT, MasterProfile, text)
