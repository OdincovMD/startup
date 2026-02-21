"""
AsyncOrm — асинхронная обёртка над SyncOrm для роли студента.
"""

import asyncio
from typing import Optional, List

from app import models
from app.roles.student.queries.sync_orm import SyncOrm


class AsyncOrm:
    @staticmethod
    async def get_student_by_user(user_id: int) -> Optional[models.Student]:
        return await asyncio.to_thread(SyncOrm.get_student_by_user, user_id)

    @staticmethod
    async def upsert_student_profile(
        user_id: int,
        full_name: Optional[str] = None,
        status: Optional[str] = None,
        skills: Optional[List[str]] = None,
        summary: Optional[str] = None,
        resume_url: Optional[str] = None,
        document_urls: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        research_interests: Optional[List[str]] = None,
    ) -> models.Student:
        return await asyncio.to_thread(
            SyncOrm.upsert_student_profile,
            user_id,
            full_name,
            status,
            skills,
            summary,
            resume_url,
            document_urls,
            education,
            research_interests,
        )
