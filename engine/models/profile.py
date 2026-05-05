from pydantic import BaseModel, Field
from typing import Optional


class PersonalInfo(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class InferredTraits(BaseModel):
    requires_sponsorship: bool = False
    willing_to_relocate: bool = False
    years_of_experience: Optional[int] = None


class Links(BaseModel):
    github: Optional[str] = None
    linkedin: Optional[str] = None
    leetcode: Optional[str] = None
    portfolio: Optional[str] = None


class DateRange(BaseModel):
    start: Optional[str] = Field(default=None, description="YYYY-MM or YYYY")
    end: Optional[str] = Field(default=None, description="YYYY-MM or Present")


class Experience(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    dates: Optional[DateRange] = None
    description: Optional[str] = None
    highlights: list[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: str
    degree: str
    field: Optional[str] = None
    dates: Optional[DateRange] = None
    gpa: Optional[str] = None


class SkillCategory(BaseModel):
    category: str
    skills: list[str]


class MasterProfile(BaseModel):
    personal_info: PersonalInfo
    inferred_traits: InferredTraits = InferredTraits()
    links: Links = Links()
    experience: list[Experience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    skills: list[SkillCategory] = Field(default_factory=list)
    custom_qna_memory: dict[str, str] = Field(default_factory=dict)
