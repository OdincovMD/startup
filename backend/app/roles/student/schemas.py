"""
Pydantic-схемы для роли студента.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel

from app.common import ORMModel


class StudentBase(BaseModel):
    user_id: int
    full_name: str
    university: Optional[str] = None
    level: Optional[str] = None
    direction: Optional[str] = None
    status: Optional[str] = None
    skills: Optional[List[str]] = None
    summary: Optional[str] = None
    photo_url: Optional[str] = None
    resume_url: Optional[str] = None
    document_urls: Optional[List[str]] = None
    education: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None
    contacts: Optional[Dict[str, Any]] = None


class StudentCreate(StudentBase):
    pass


class StudentRead(ORMModel, StudentBase):
    id: int
    created_at: datetime


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    university: Optional[str] = None
    level: Optional[str] = None
    direction: Optional[str] = None
    status: Optional[str] = None
    skills: Optional[List[str]] = None
    summary: Optional[str] = None
    photo_url: Optional[str] = None
    resume_url: Optional[str] = None
    document_urls: Optional[List[str]] = None
    education: Optional[List[str]] = None
    research_interests: Optional[List[str]] = None
    contacts: Optional[Dict[str, Any]] = None
