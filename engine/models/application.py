from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ApplicationState(BaseModel):
    job_url: str
    ats_platform: str
    job_title: str
    company: str
    match_score: Optional[float] = None
    status: str = "pending"
    steps_log: list[dict] = []
    custom_questions: list[dict] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ApplicationStartRequest(BaseModel):
    job_url: str
    profile_id: int = 1


class ApplicationPauseRequest(BaseModel):
    application_id: str


class ApplicationResumeRequest(BaseModel):
    application_id: str


class ManualAnswerRequest(BaseModel):
    application_id: str
    question: str
    answer: str
