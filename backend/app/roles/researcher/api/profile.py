"""
Роуты FastAPI для профиля исследователя.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.roles.researcher.schemas import ResearcherRead, ResearcherUpdate
from app.queries.orm import AsyncOrm

router = APIRouter()


def _is_researcher(user) -> bool:
    return user.role is not None and user.role.name == "researcher"


@router.get("/researcher", response_model=ResearcherRead | None)
async def get_researcher_profile(current_user=Depends(get_current_user)):
    if not _is_researcher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для роли исследователя")
    researcher = await AsyncOrm.get_researcher_by_user(current_user.id)
    return researcher


@router.put("/researcher", response_model=ResearcherRead)
async def upsert_researcher_profile(
    payload: ResearcherUpdate,
    current_user=Depends(get_current_user),
):
    if not _is_researcher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для роли исследователя")
    patch = payload.model_dump(exclude_unset=True)
    researcher = await AsyncOrm.upsert_researcher_profile(
        current_user.id,
        full_name=patch.get("full_name"),
        position=patch.get("position"),
        academic_degree=patch.get("academic_degree"),
        research_interests=patch.get("research_interests"),
        education=patch.get("education"),
        publications=patch.get("publications"),
        hindex_wos=patch.get("hindex_wos"),
        hindex_scopus=patch.get("hindex_scopus"),
        hindex_rsci=patch.get("hindex_rsci"),
        hindex_openalex=patch.get("hindex_openalex"),
        job_search_status=patch.get("job_search_status"),
        desired_positions=patch.get("desired_positions"),
        employment_type_preference=patch.get("employment_type_preference"),
        preferred_region=patch.get("preferred_region"),
        availability_date=patch.get("availability_date"),
        salary_expectation=patch.get("salary_expectation"),
        job_search_notes=patch.get("job_search_notes"),
        resume_url=patch.get("resume_url"),
        document_urls=patch.get("document_urls"),
    )
    logger.info("Researcher profile upserted: user_id=%s researcher_id=%s", current_user.id, researcher.id)
    return researcher
