"""
Роуты FastAPI для профиля представителя (организация, лаборатории, оборудование и т.д.).
Объединяет все представления (views): equipment, laboratories, employees, tasks, queries, vacancies.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.roles.representative.schemas import (
    OrganizationRead,
    OrganizationUpdate,
    OrganizationEquipmentCreate,
    OrganizationEquipmentRead,
    OrganizationEquipmentUpdate,
    OrganizationLaboratoryCreate,
    OrganizationLaboratoryRead,
    OrganizationLaboratoryUpdate,
    OrganizationTaskSolutionCreate,
    OrganizationTaskSolutionRead,
    OrganizationTaskSolutionUpdate,
    OrganizationQueryCreate,
    OrganizationQueryRead,
    OrganizationQueryUpdate,
    VacancyOrganizationCreate,
    VacancyOrganizationRead,
    VacancyOrganizationUpdate,
    EmployeeCreate,
    EmployeeRead,
    EmployeeUpdate,
)
from app.queries.async_orm import AsyncOrm

from .equipment import router as equipment_router
from .laboratories import router as laboratories_router
from .employees import router as employees_router
from .tasks import router as tasks_router
from .queries import router as queries_router
from .vacancies import router as vacancies_router

router = APIRouter()

# Include view subfolders
router.include_router(equipment_router, tags=["profile-equipment"])
router.include_router(laboratories_router, tags=["profile-laboratories"])
router.include_router(employees_router, tags=["profile-employees"])
router.include_router(tasks_router, tags=["profile-tasks"])
router.include_router(queries_router, tags=["profile-queries"])
router.include_router(vacancies_router, tags=["profile-vacancies"])


# =========================
#    ORGANIZATION PROFILE
# =========================

@router.get("/organization", response_model=OrganizationRead | None)
async def get_org_profile(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    return org


@router.put("/organization", response_model=OrganizationRead)
async def upsert_org_profile(
    payload: OrganizationUpdate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.upsert_organization_for_user(
        current_user.id,
        name=payload.name,
        avatar_url=payload.avatar_url,
        description=payload.description,
        address=payload.address,
        website=payload.website,
        ror_id=payload.ror_id,
    )
    return org


class PublishToggle(BaseModel):
    is_published: bool


@router.put("/organization/publish", response_model=OrganizationRead)
async def set_org_publish_state(
    payload: PublishToggle,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if payload.is_published and (not org.name or not str(org.name).strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сначала заполните и сохраните профиль организации.",
        )
    updated = await AsyncOrm.set_organization_published(org.id, payload.is_published)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    return updated
