from pydantic import BaseModel
from typing import Optional


class ApplicationStartRequest(BaseModel):
    job_url: str
    profile: dict = {}
    ats_type: str = "generic"
    job_title: str = ""
    job_company: str = ""


class ManualAnswerRequest(BaseModel):
    question: str
    answer: str
