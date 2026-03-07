"""
Pydantic-схемы для роли студента.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.common import ORMModel


class StudentBase(BaseModel):
    user_id: int
    full_name: str
    status: Optional[str] = None
    skills: Optional[List[str]] = None
    summary: Optional[str] = None
    resume_url: Optional[str] = None
    document_urls: Optional[List[str]] = None
    education: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None


class StudentCreate(StudentBase):
    pass


class StudentRead(ORMModel, StudentBase):
    id: int
    is_published: Optional[bool] = None
    created_at: datetime


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None
    skills: Optional[List[str]] = None
    summary: Optional[str] = None
    resume_url: Optional[str] = None
    document_urls: Optional[List[str]] = None
    education: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None
