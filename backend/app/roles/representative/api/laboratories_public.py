"""
Роуты FastAPI для работы с лабораториями (публичные страницы).
GET / — список опубликованных лабораторий,
GET /public/{public_id}/details — детали лаборатории по public_id.
"""

import asyncio

from fastapi import APIRouter, HTTPException, status

from app.roles.representative.schemas import OrganizationLaboratoryRead, LaboratoryDetails
from app.queries.async_orm import AsyncOrm

router = APIRouter(prefix="/laboratories", tags=["laboratories"])


@router.get("/", response_model=list[OrganizationLaboratoryRead])
async def list_laboratories():
    """Список опубликованных лабораторий для публичного каталога."""
    try:
        labs = await AsyncOrm.list_published_laboratories()
        for lab in labs:
            org = getattr(lab, "organization", None)
            if org is not None and not getattr(org, "is_published", False):
                lab.organization = None
            # Исключаем исследователей, которые уже в сотрудниках (дубликат)
            employee_user_ids = {e.user_id for e in (lab.employees or []) if getattr(e, "user_id", None)}
            lab.researchers = [r for r in (lab.researchers or []) if getattr(r, "user_id", None) not in employee_user_ids]
        return labs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "LABORATORY_LIST_FAILURE", "message": str(e)},
        )


@router.get("/public/{public_id}/details", response_model=LaboratoryDetails)
async def get_laboratory_details(public_id: str):
    """Получение детальной информации о лаборатории по public_id."""
    lab = await AsyncOrm.get_laboratory_by_public_id(public_id)
    if not lab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory not found",
        )
    if not getattr(lab, "is_published", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Laboratory not published",
        )
    
    # Загружаем связанные запросы (queries) и вакансии для этой лаборатории
    org_queries = []
    if lab.organization_id:
        all_queries = await AsyncOrm.list_published_queries_for_org(lab.organization_id)
        org_queries = [q for q in all_queries if any(l.id == lab.id for l in (q.laboratories or []))]
    else:
        # Лаборатория без организации (lab representative): запросы по creator / query_laboratories
        all_queries = await AsyncOrm.list_published_queries()
        org_queries = [q for q in all_queries if any(l.id == lab.id for l in (q.laboratories or []))]
    vacancies = await AsyncOrm.list_published_vacancies_for_laboratory(lab.id)

    # Формируем объект организации для ответа (только если она опубликована)
    org_short = None
    if lab.organization and getattr(lab.organization, "is_published", False):
        org_short = {
            "id": lab.organization.id,
            "public_id": lab.organization.public_id,
            "name": lab.organization.name,
            "avatar_url": lab.organization.avatar_url,
        }

    # Исключаем исследователей, которые уже в сотрудниках (при approve создаётся Employee)
    employee_user_ids = {e.user_id for e in (lab.employees or []) if getattr(e, "user_id", None)}
    researchers_filtered = [r for r in (lab.researchers or []) if getattr(r, "user_id", None) not in employee_user_ids]

    head_short = None
    if getattr(lab, "head_employee", None):
        he = lab.head_employee
        head_short = {
            "id": he.id,
            "full_name": he.full_name or "",
            "positions": getattr(he, "positions", None),
            "academic_degree": getattr(he, "academic_degree", None),
            "photo_url": getattr(he, "photo_url", None),
        }

    task_solutions = lab.task_solutions or []

    return LaboratoryDetails(
        id=lab.id,
        public_id=lab.public_id,
        name=lab.name,
        description=lab.description,
        activities=lab.activities,
        image_urls=lab.image_urls or [],
        created_at=lab.created_at,
        is_published=lab.is_published,
        organization=org_short,
        head_employee=head_short,
        employees=lab.employees or [],
        researchers=researchers_filtered,
        equipment=lab.equipment or [],
        task_solutions=task_solutions,
        queries=org_queries,
        vacancies=vacancies,
    )
