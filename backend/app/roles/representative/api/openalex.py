"""
API для привязки и импорта данных OpenAlex (профиль организации).
"""

import logging

from sqlalchemy.exc import IntegrityError

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.queries.orm import Orm
from app.services.elasticsearch import reindex_organizations_by_ids
from app.services.openalex import (
    fetch_institution_by_ror,
    map_institution_to_organization,
)

router = APIRouter(prefix="/organization/openalex", tags=["profile-org-openalex"])


class LinkRorBody(BaseModel):
    ror_id: str


def _extract_ror_id(val: str) -> str:
    """Extract ROR ID from URL or raw ID."""
    val = val.strip()
    if "ror.org/" in val:
        return val.split("/")[-1]
    return val


def _is_org_representative(user) -> bool:
    return user.role is not None and user.role.name in ("lab_admin", "lab_representative")


@router.post("/link")
async def link_ror(
    body: LinkRorBody,
    current_user=Depends(get_current_user),
):
    """Привязать ROR ID. Проверка через API, сохранение в organizations.ror_id. Только lab_admin/lab_representative."""
    if not _is_org_representative(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для представителя организации",
        )
    org = await Orm.get_organization_for_user(current_user.id)
    if not org:
        try:
            org = await Orm.upsert_organization_for_user(current_user.id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    ror_id = _extract_ror_id(body.ror_id)
    if not ror_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный ROR ID")
    institution = fetch_institution_by_ror(ror_id)
    if not institution:
        logger.warning("ROR link failed: institution not found ror_id=%s", ror_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена в OpenAlex. Проверьте ROR ID.",
        )
    try:
        await Orm.update_organization_ror(org.id, ror_id)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Организация с таким ROR ID уже добавлена на платформу.",
        )
    mapped = map_institution_to_organization(institution)
    updated = await Orm.upsert_organization_for_user(
        current_user.id,
        name=mapped.get("name"),
        avatar_url=mapped.get("avatar_url"),
        address=mapped.get("address"),
        website=mapped.get("website"),
    )
    logger.info("ROR linked to organization: org_id=%s ror_id=%s", org.id, ror_id)
    try:
        await reindex_organizations_by_ids([updated.id])
    except Exception as e:
        logger.warning("Organization reindex failed after ROR link: org_id=%s %s", updated.id, e)
    return {"ror_id": updated.ror_id, "display_name": institution.get("display_name")}


@router.delete("/unlink")
async def unlink_ror(current_user=Depends(get_current_user)):
    """Отвязать ROR."""
    if not _is_org_representative(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для представителя организации",
        )
    org = await Orm.get_organization_for_user(current_user.id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    await Orm.update_organization_ror(org.id, None)
    logger.info("ROR unlinked from organization: org_id=%s", org.id)
    try:
        await reindex_organizations_by_ids([org.id])
    except Exception as e:
        logger.warning("Organization reindex failed after ROR unlink: org_id=%s %s", org.id, e)
    return {"ok": True}


@router.post("/import")
async def import_org_openalex(current_user=Depends(get_current_user)):
    """Импорт данных организации из OpenAlex по ror_id. Обновить name, website, address, avatar_url."""
    if not _is_org_representative(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для представителя организации",
        )
    org = await Orm.get_organization_for_user(current_user.id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if not org.ror_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Привяжите ROR ID для импорта данных.",
        )
    institution = fetch_institution_by_ror(org.ror_id)
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена в OpenAlex.",
        )
    mapped = map_institution_to_organization(institution)
    updated = await Orm.upsert_organization_for_user(
        current_user.id,
        name=mapped.get("name"),
        avatar_url=mapped.get("avatar_url"),
        address=mapped.get("address"),
        website=mapped.get("website"),
    )
    logger.info("Organization OpenAlex import completed: org_id=%s ror_id=%s", updated.id, org.ror_id)
    try:
        await reindex_organizations_by_ids([updated.id])
    except Exception as e:
        logger.warning("Organization reindex failed after OpenAlex import: org_id=%s %s", updated.id, e)
    return {"ok": True, "organization_id": updated.id}
