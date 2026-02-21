"""
AsyncOrm — асинхронная обёртка над SyncOrm для роли исследователя.
"""

import asyncio
from typing import Optional, List

from app import models
from app.roles.researcher.queries.sync_orm import SyncOrm


class AsyncOrm:
    @staticmethod
    async def get_researcher_by_user(user_id: int) -> Optional[models.Researcher]:
        return await asyncio.to_thread(SyncOrm.get_researcher_by_user, user_id)

    @staticmethod
    async def upsert_researcher_profile(
        user_id: int,
        full_name: Optional[str] = None,
        position: Optional[str] = None,
        academic_degree: Optional[str] = None,
        research_interests: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        publications: Optional[List] = None,
        hindex_wos: Optional[int] = None,
        hindex_scopus: Optional[int] = None,
        hindex_rsci: Optional[int] = None,
        hindex_openalex: Optional[int] = None,
        job_search_status: Optional[str] = None,
        desired_positions: Optional[str] = None,
        employment_type_preference: Optional[str] = None,
        preferred_region: Optional[str] = None,
        availability_date: Optional[str] = None,
        salary_expectation: Optional[str] = None,
        job_search_notes: Optional[str] = None,
        resume_url: Optional[str] = None,
        document_urls: Optional[List[str]] = None,
    ) -> models.Researcher:
        return await asyncio.to_thread(
            SyncOrm.upsert_researcher_profile,
            user_id,
            full_name,
            position,
            academic_degree,
            research_interests,
            education,
            publications,
            hindex_wos,
            hindex_scopus,
            hindex_rsci,
            hindex_openalex,
            job_search_status,
            desired_positions,
            employment_type_preference,
            preferred_region,
            availability_date,
            salary_expectation,
            job_search_notes,
            resume_url,
            document_urls,
        )
