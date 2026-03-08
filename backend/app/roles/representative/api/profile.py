"""
Роуты FastAPI для профиля представителя (организация, лаборатории, оборудование и т.д.).
Объединяет все представления (views): equipment, laboratories, employees, tasks, queries, vacancies.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.services.elasticsearch import (
    reindex_laboratories_by_ids,
    delete_organization,
    reindex_organizations_by_ids,
)
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
from app.queries.orm import Orm

from .equipment import router as equipment_router
from .laboratories import router as laboratories_router
from .employees import router as employees_router
from .tasks import router as tasks_router
from .queries import router as queries_router
from .vacancies import router as vacancies_router
from .profile_analytics import router as profile_analytics_router

router = APIRouter()

# Include view subfolders
router.include_router(equipment_router, tags=["profile-equipment"])
router.include_router(laboratories_router, tags=["profile-laboratories"])
router.include_router(employees_router, tags=["profile-employees"])
router.include_router(tasks_router, tags=["profile-tasks"])
router.include_router(queries_router, tags=["profile-queries"])
router.include_router(vacancies_router, tags=["profile-vacancies"])
router.include_router(profile_analytics_router)


# =========================
#    ORGANIZATION PROFILE
# =========================

@router.get("/subscription")
async def get_my_subscription(current_user=Depends(get_current_user)):
    """
    Текущая подписка пользователя. Для отображения статуса в дашборде и шапке.
    """
    sub = await Orm.get_active_subscription(current_user.id)
    if not sub:
        return {"active": False, "expires_at": None, "status": "none", "started_at": None}
    return {
        "active": True,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        "status": sub.status or "active",
        "started_at": sub.started_at.isoformat() if sub.started_at else None,
    }


@router.get("/organization", response_model=OrganizationRead | None)
async def get_org_profile(current_user=Depends(get_current_user)):
    org = await Orm.get_organization_for_user(current_user.id)
    return org


@router.put("/organization", response_model=OrganizationRead)
async def upsert_org_profile(
    payload: OrganizationUpdate,
    current_user=Depends(get_current_user),
):
    try:
        org = await Orm.upsert_organization_for_user(
            current_user.id,
            name=payload.name,
            avatar_url=payload.avatar_url,
            description=payload.description,
            address=payload.address,
            website=payload.website,
            ror_id=payload.ror_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if org and org.id:
        labs = await Orm.list_published_laboratories_for_org(org.id)
        if labs:
            try:
                await reindex_laboratories_by_ids([l.id for l in labs])
            except Exception as e:
                logging.getLogger(__name__).warning(
                    "Laboratory reindex failed after org profile update: org_id=%s %s", org.id, e
                )
        try:
            await reindex_organizations_by_ids([org.id])
        except Exception as e:
            logging.getLogger(__name__).warning(
                "Organization reindex failed after profile update: org_id=%s %s", org.id, e
            )
    return org


class PublishToggle(BaseModel):
    is_published: bool


@router.put("/organization/publish", response_model=OrganizationRead)
async def set_org_publish_state(
    payload: PublishToggle,
    current_user=Depends(get_current_user),
):
    org = await Orm.get_organization_for_user(current_user.id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if payload.is_published and (not org.name or not str(org.name).strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сначала заполните и сохраните профиль организации.",
        )
    updated = await Orm.set_organization_published(org.id, payload.is_published)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    try:
        if payload.is_published:
            await reindex_organizations_by_ids([org.id])
        else:
            await delete_organization(org.id)
    except Exception as e:
        logging.getLogger(__name__).warning(
            "Organization index sync failed after publish toggle: org_id=%s %s", org.id, e
        )
    return updated
