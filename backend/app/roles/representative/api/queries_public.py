"""
Публичные роуты FastAPI для работы с запросами организаций.
GET /queries/ — список опубликованных запросов,
GET /queries/public/{public_id}/details — детали запроса по public_id.
"""

from fastapi import APIRouter, HTTPException, status

from app.roles.representative.schemas import (
    OrganizationQueryRead,
    OrganizationQueryBase,
    OrganizationShort,
    OrganizationLaboratoryShort,
    EmployeeRead,
    VacancyOrganizationRead,
)
from app.queries.async_orm import AsyncOrm

from datetime import datetime
from typing import List, Optional


class QueryDetails(OrganizationQueryBase):
    id: int
    public_id: Optional[str] = None
    organization_id: Optional[int] = None
    created_at: datetime
    organization: Optional[OrganizationShort] = None
    laboratories: List[OrganizationLaboratoryShort] = []
    employees: List[EmployeeRead] = []
    vacancies: List[VacancyOrganizationRead] = []


router = APIRouter(prefix="/queries", tags=["queries"])


@router.get("/", response_model=list[OrganizationQueryRead])
async def list_queries():
    """Список опубликованных запросов для публичного каталога."""
    try:
        queries = await AsyncOrm.list_published_queries()
        # Фильтруем вакансии только опубликованные
        for q in queries:
            q.vacancies = [v for v in (q.vacancies or []) if getattr(v, "is_published", False)]
        return queries
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "QUERY_LIST_FAILURE", "message": str(e)},
        )


@router.get("/public/{public_id}/details", response_model=QueryDetails)
async def get_query_details(public_id: str):
    """Получение детальной информации о запросе по public_id."""
    query = await AsyncOrm.get_query_by_public_id(public_id)
    if not query or not getattr(query, "is_published", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query not found",
        )

    # Организация: показываем только если она опубликована
    org_short = None
    if query.organization and getattr(query.organization, "is_published", False):
        org_short = OrganizationShort(
            id=query.organization.id,
            public_id=query.organization.public_id,
            name=query.organization.name,
            avatar_url=query.organization.avatar_url,
        )

    # Лаборатории: только опубликованные
    labs = [
        OrganizationLaboratoryShort(
            id=lab.id,
            public_id=lab.public_id,
            name=lab.name,
            description=lab.description,
            activities=lab.activities,
            image_urls=lab.image_urls,
            is_published=lab.is_published,
            created_at=lab.created_at,
            organization_id=lab.organization_id,
        )
        for lab in (query.laboratories or [])
        if getattr(lab, "is_published", False)
    ]

    # Вакансии: только опубликованные
    vacancies = [v for v in (query.vacancies or []) if getattr(v, "is_published", False)]

    return QueryDetails(
        id=query.id,
        public_id=query.public_id,
        title=query.title,
        task_description=query.task_description,
        completed_examples=query.completed_examples,
        article_links=query.article_links or [],
        budget=query.budget,
        deadline=query.deadline,
        status=query.status,
        linked_task_solution_id=query.linked_task_solution_id,
        is_published=query.is_published,
        organization_id=query.organization_id,
        created_at=query.created_at,
        organization=org_short,
        laboratories=labs,
        employees=list(query.employees or []),
        vacancies=vacancies,
    )

