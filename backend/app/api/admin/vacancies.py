"""Admin API: vacancies CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import index_vacancy, delete_vacancy as es_delete_vacancy
from app.roles.representative.schemas import VacancyOrganizationUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-vacancies"])


def _vacancy_to_read(vac):
    """Serialize Vacancy for admin response."""
    return {
        "id": vac.id,
        "public_id": vac.public_id,
        "name": vac.name or "",
        "requirements": vac.requirements,
        "description": vac.description,
        "employment_type": vac.employment_type,
        "is_published": getattr(vac, "is_published", False),
        "created_at": vac.created_at,
        "organization_id": vac.organization_id,
        "creator_user_id": getattr(vac, "creator_user_id", None),
        "laboratory_id": getattr(vac, "laboratory_id", None),
        "query_id": getattr(vac, "query_id", None),
        "contact_employee_id": getattr(vac, "contact_employee_id", None),
        "contact_email": getattr(vac, "contact_email", None),
        "contact_phone": getattr(vac, "contact_phone", None),
    }


@router.get("/vacancies")
async def list_vacancies_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all vacancies (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_vacancies_admin(page=page, size=size)
    return {"items": [_vacancy_to_read(v) for v in items], "total": total, "page": page, "size": size}


@router.get("/vacancies/{vacancy_id}")
async def get_vacancy_admin(
    vacancy_id: int,
    current_user=Depends(get_current_user),
):
    """Get vacancy by id (admin only)."""
    require_admin(current_user)
    vac = await Orm.get_vacancy(vacancy_id)
    if not vac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    return _vacancy_to_read(vac)


@router.put("/vacancies/{vacancy_id}")
async def update_vacancy_admin(
    vacancy_id: int,
    payload: VacancyOrganizationUpdate,
    current_user=Depends(get_current_user),
):
    """Update vacancy (admin only)."""
    require_admin(current_user)
    patch = payload.model_dump(exclude_unset=True)
    vac = await Orm.admin_update_vacancy(
        vacancy_id,
        name=patch.get("name"),
        requirements=patch.get("requirements"),
        description=patch.get("description"),
        employment_type=patch.get("employment_type"),
        is_published=patch.get("is_published"),
        query_id=patch.get("query_id"),
        laboratory_id=patch.get("laboratory_id"),
        contact_employee_id=patch.get("contact_employee_id"),
        contact_email=patch.get("contact_email"),
        contact_phone=patch.get("contact_phone"),
    )
    if not vac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    try:
        vac_full = await Orm.get_vacancy(vacancy_id)
        if vac_full and getattr(vac_full, "is_published", False):
            await index_vacancy(vac_full)
        else:
            await es_delete_vacancy(vacancy_id)
    except Exception as e:
        logger.warning("ES sync failed for vacancy %s: %s", vacancy_id, e)
    return _vacancy_to_read(vac)


@router.delete("/vacancies/{vacancy_id}")
async def delete_vacancy_admin(
    vacancy_id: int,
    current_user=Depends(get_current_user),
):
    """Delete vacancy (admin only)."""
    require_admin(current_user)
    vac = await Orm.get_vacancy(vacancy_id)
    if not vac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    ok = await Orm.admin_delete_vacancy(vacancy_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    try:
        await es_delete_vacancy(vacancy_id)
    except Exception as e:
        logger.warning("ES delete failed for vacancy %s: %s", vacancy_id, e)
    return {"ok": True}
