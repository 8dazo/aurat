from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Job(BaseModel):
    url: str
    title: str
    company: str
    location: Optional[str] = None
    ats_id: Optional[str] = None
    ats_type: Optional[str] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    salary_summary: Optional[str] = None
    experience: Optional[str] = None
    description: Optional[str] = None
    posted_at: Optional[datetime] = None


class JobListResponse(BaseModel):
    jobs: list[Job]
    total: int
    page: int
    page_size: int
    total_pages: int


class JobFiltersResponse(BaseModel):
    companies: list[str]
    ats_types: list[str]
    locations: list[str]
