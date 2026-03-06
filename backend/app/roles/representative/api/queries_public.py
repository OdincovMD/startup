"""
Публичные роуты FastAPI для работы с запросами организаций.
GET /queries/suggest — подсказки для автодополнения,
GET /queries/ — список опубликованных запросов (с поиском по q),
GET /queries/public/{public_id}/details — детали запроса по public_id.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.queries.orm import AsyncOrm
from app.roles.representative.schemas import (
    OrganizationQueryBase,
    OrganizationLaboratoryShort,
    OrganizationQueryRead,
    OrganizationShort,
    OrganizationTaskSolutionRead,
    EmployeeRead,
    VacancyOrganizationRead,
)
from app.services.elasticsearch import search_queries, suggest_queries


class QueryDetails(OrganizationQueryBase):
    id: int
    public_id: Optional[str] = None
    organization_id: Optional[int] = None
    created_at: datetime
    organization: Optional[OrganizationShort] = None
    linked_task_solution: Optional[OrganizationTaskSolutionRead] = None
    laboratories: List[OrganizationLaboratoryShort] = []
    employees: List[EmployeeRead] = []
    vacancies: List[VacancyOrganizationRead] = []


router = APIRouter(prefix="/queries", tags=["queries"])


@router.get("/suggest")
async def suggest_queries_endpoint(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=20),
):
    """Подсказки для автодополнения поиска запросов."""
    suggestions = await suggest_queries(q=q.strip(), limit=limit)
    return {"suggestions": suggestions}


@router.get("/", response_model=list[OrganizationQueryRead])
async def list_queries(
    q: str = Query("", min_length=0),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    laboratory_id: Optional[int] = Query(None, ge=1),
    budget_contains: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="date_desc | date_asc"),
):
    """Список опубликованных запросов. При q или любом фильтре — поиск через Elasticsearch."""
    q_stripped = (q or "").strip()
    has_search_or_filters = bool(
        q_stripped
        or (status and status.strip())
        or laboratory_id is not None
        or (budget_contains and budget_contains.strip())
    )
    if has_search_or_filters:
        try:
            result = await search_queries(
                q=q_stripped,
                page=page,
                size=size,
                status=status,
                laboratory_id=laboratory_id,
                budget_contains=budget_contains,
                sort_by=sort_by,
            )
            return result.get("items", [])
        except Exception:
            return []
    try:
        queries = await AsyncOrm.list_published_queries()
        for query in queries:
            query.vacancies = [v for v in (query.vacancies or []) if getattr(v, "is_published", False)]
        if sort_by == "date_asc":
            queries = sorted(queries, key=lambda q: getattr(q, "created_at") or "", reverse=False)
        else:
            queries = sorted(queries, key=lambda q: getattr(q, "created_at") or "", reverse=True)
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
        grant_info=query.grant_info,
        budget=query.budget,
        deadline=query.deadline,
        status=query.status,
        linked_task_solution_id=query.linked_task_solution_id,
        is_published=query.is_published,
        organization_id=query.organization_id,
        created_at=query.created_at,
        organization=org_short,
        linked_task_solution=query.linked_task_solution,
        laboratories=labs,
        employees=list(query.employees or []),
        vacancies=vacancies,
    )

