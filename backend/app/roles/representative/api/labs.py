"""
Роуты FastAPI для работы с организациями (лабораториями).
POST / — создание организации,
GET / — список организаций,
GET /{org_id} — получение организации по ID.
"""

import asyncio

from fastapi import APIRouter, HTTPException, status, Depends

from app.roles.representative.schemas import OrganizationCreate, OrganizationRead, OrganizationDetails
from app.queries.async_orm import AsyncOrm
from app.api.deps import get_current_user

router = APIRouter(prefix="/labs", tags=["labs"])


@router.post("/", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_lab(lab_in: OrganizationCreate, _user=Depends(get_current_user)):
    """Создание новой организации."""
    try:
        org = await AsyncOrm.create_organization(
            name=lab_in.name,
            avatar_url=lab_in.avatar_url,
            description=lab_in.description,
            address=lab_in.address,
            website=lab_in.website,
        )
        logger.info("Organization created: id=%s name=%s", org.id, org.name)
        return org
    except Exception as e:
        logger.warning("Organization creation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "LAB_CREATION_FAILURE", "message": str(e)},
        )


@router.get("/", response_model=list[OrganizationRead])
async def list_labs():
    """Список опубликованных организаций для публичного каталога."""
    try:
        return await AsyncOrm.list_published_organizations()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "LAB_LIST_FAILURE", "message": str(e)},
        )


@router.get("/{org_id}", response_model=OrganizationRead)
async def get_lab(org_id: int):
    """Получение организации по ID."""
    org = await AsyncOrm.get_organization(org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return org


@router.get("/public/{public_id}/details", response_model=OrganizationDetails)
async def get_lab_details(public_id: str):
    org = await AsyncOrm.get_organization_by_public_id(public_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    if not getattr(org, "is_published", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization not published",
        )
    equipment, laboratories, employees, task_solutions, queries, vacancies = await asyncio.gather(
        AsyncOrm.list_equipment_for_org(org.id),
        AsyncOrm.list_published_laboratories_for_org(org.id),
        AsyncOrm.list_employees_for_org(org.id),
        AsyncOrm.list_task_solutions_for_org(org.id),
        AsyncOrm.list_published_queries_for_org(org.id),
        AsyncOrm.list_published_vacancies_for_org(org.id),
    )
    for lab in laboratories:
        employee_user_ids = {e.user_id for e in (lab.employees or []) if getattr(e, "user_id", None)}
        lab.researchers = [r for r in (lab.researchers or []) if getattr(r, "user_id", None) not in employee_user_ids]
    return OrganizationDetails(
        id=org.id,
        public_id=org.public_id,
        name=org.name,
        avatar_url=org.avatar_url,
        description=org.description,
        address=org.address,
        website=org.website,
        created_at=org.created_at,
        equipment=equipment,
        laboratories=laboratories,
        employees=employees,
        task_solutions=task_solutions,
        queries=queries,
        vacancies=vacancies,
    )
