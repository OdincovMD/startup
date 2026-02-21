"""
Pydantic-схемы для роли исследователя.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.common import ORMModel


class PublicationItem(BaseModel):
    title: str
    link: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class ResearcherBase(BaseModel):
    full_name: str
    position: Optional[str] = None
    academic_degree: Optional[str] = None
    research_interests: Optional[List[str]] = None
    education: Optional[List[str]] = None
    publications: Optional[List[PublicationItem]] = None
    hindex_wos: Optional[int] = None
    hindex_scopus: Optional[int] = None
    hindex_rsci: Optional[int] = None
    hindex_openalex: Optional[int] = None
    job_search_status: Optional[str] = None
    desired_positions: Optional[str] = None
    employment_type_preference: Optional[str] = None
    preferred_region: Optional[str] = None
    availability_date: Optional[str] = None
    salary_expectation: Optional[str] = None
    job_search_notes: Optional[str] = None
    resume_url: Optional[str] = None
    document_urls: Optional[List[str]] = None


class ResearcherCreate(ResearcherBase):
    pass


class ResearcherRead(ORMModel, ResearcherBase):
    id: int
    organization_id: Optional[int] = None
    laboratories: Optional[List["OrganizationLaboratoryShort"]] = None
    created_at: datetime


class ResearcherUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    academic_degree: Optional[str] = None
    research_interests: Optional[List[str]] = None
    education: Optional[List[str]] = None
    publications: Optional[List[PublicationItem]] = None
    hindex_wos: Optional[int] = None
    hindex_scopus: Optional[int] = None
    hindex_rsci: Optional[int] = None
    hindex_openalex: Optional[int] = None
    job_search_status: Optional[str] = None
    desired_positions: Optional[str] = None
    employment_type_preference: Optional[str] = None
    preferred_region: Optional[str] = None
    availability_date: Optional[str] = None
    salary_expectation: Optional[str] = None
    job_search_notes: Optional[str] = None
    resume_url: Optional[str] = None
    document_urls: Optional[List[str]] = None
    laboratory_ids: Optional[List[int]] = None


# Resolve forward ref (OrganizationLaboratoryShort from representative)
def _resolve_researcher_read():
    from app.roles.representative.schemas import OrganizationLaboratoryShort
    ResearcherRead.model_rebuild(_types_namespace={"OrganizationLaboratoryShort": OrganizationLaboratoryShort})
_resolve_researcher_read()
