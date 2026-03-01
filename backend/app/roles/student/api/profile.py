"""
Роуты FastAPI для профиля студента.
"""

import logging

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.roles.student.schemas import StudentRead, StudentUpdate
from app.queries.async_orm import AsyncOrm

router = APIRouter()


@router.get("/student", response_model=StudentRead | None)
async def get_student_profile(current_user=Depends(get_current_user)):
    student = await AsyncOrm.get_student_by_user(current_user.id)
    return student


@router.put("/student", response_model=StudentRead)
async def upsert_student_profile(
    payload: StudentUpdate,
    current_user=Depends(get_current_user),
):
    patch = payload.model_dump(exclude_unset=True)
    student = await AsyncOrm.upsert_student_profile(
        current_user.id,
        full_name=patch.get("full_name"),
        status=patch.get("status"),
        skills=patch.get("skills"),
        summary=patch.get("summary"),
        resume_url=patch.get("resume_url"),
        document_urls=patch.get("document_urls"),
        education=patch.get("education"),
        research_interests=patch.get("research_interests"),
    )
    logger.info("Student profile upserted: user_id=%s student_id=%s", current_user.id, student.id)
    return student
