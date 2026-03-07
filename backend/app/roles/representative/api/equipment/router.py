"""Equipment view — CRUD для оборудования."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.services.elasticsearch import reindex_laboratories_by_ids, reindex_organizations_by_ids

logger = logging.getLogger(__name__)
from app.roles.representative.schemas import (
    OrganizationEquipmentCreate,
    OrganizationEquipmentRead,
    OrganizationEquipmentUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.orm import Orm

router = APIRouter()


@router.get("/organization/equipment", response_model=list[OrganizationEquipmentRead])
async def list_org_equipment(current_user=Depends(get_current_user)):
    org = await Orm.get_organization_for_user(current_user.id)
    if org:
        return await Orm.list_equipment_for_org(org.id)
    if is_lab_representative(current_user):
        return await Orm.list_equipment_for_creator(current_user.id)
    return []


@router.post("/organization/equipment", response_model=OrganizationEquipmentRead)
async def create_org_equipment(
    payload: OrganizationEquipmentCreate,
    current_user=Depends(get_current_user),
):
    org = await Orm.get_organization_for_user(current_user.id)
    if org:
        eq = await Orm.create_equipment_for_org(
            org.id,
            creator_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            characteristics=payload.characteristics,
            image_urls=payload.image_urls,
            laboratory_ids=payload.laboratory_ids,
        )
        logger.info("Equipment created: id=%s org_id=%s", eq.id, org.id)
        lab_ids = [l.id for l in (eq.laboratories or [])] if eq else (payload.laboratory_ids or [])
        if lab_ids:
            await reindex_laboratories_by_ids(lab_ids)
        try:
            await reindex_organizations_by_ids([org.id])
        except Exception as e:
            logger.warning("Organization reindex failed after equipment create: org_id=%s %s", org.id, e)
        return eq
    if is_lab_representative(current_user):
        require_lab_link_for_lab_rep(payload.laboratory_ids)
        eq = await Orm.create_equipment_for_org(
            None,
            creator_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            characteristics=payload.characteristics,
            image_urls=payload.image_urls,
            laboratory_ids=payload.laboratory_ids,
        )
        logger.info("Equipment created: id=%s creator_user_id=%s", eq.id, current_user.id)
        lab_ids = [l.id for l in (eq.laboratories or [])] if eq else (payload.laboratory_ids or [])
        if lab_ids:
            await reindex_laboratories_by_ids(lab_ids)
        org_ids = list({l.organization_id for l in (eq.laboratories or []) if getattr(l, "organization_id", None)})
        if org_ids:
            try:
                await reindex_organizations_by_ids(org_ids)
            except Exception as e:
                logger.warning("Organization reindex failed after equipment create: %s", e)
        return eq
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Сначала заполните и сохраните профиль организации.",
    )


@router.put("/organization/equipment/{equipment_id}", response_model=OrganizationEquipmentRead)
async def update_org_equipment(
    equipment_id: int,
    payload: OrganizationEquipmentUpdate,
    current_user=Depends(get_current_user),
):
    org = await Orm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_ids = patch.get("laboratory_ids")
    if is_lab_representative(current_user) and "laboratory_ids" in patch:
        require_lab_link_for_lab_rep(laboratory_ids=laboratory_ids)
    # Получить старые lab_ids до обновления (для переиндексации при снятии оборудования с лабораторий)
    equipment_before = None
    if org:
        equipment_before = await Orm.get_equipment(equipment_id, org.id)
    elif is_lab_representative(current_user):
        equipment_before = await Orm.get_equipment_for_creator(equipment_id, current_user.id)
    old_lab_ids = [l.id for l in (equipment_before.laboratories or [])] if equipment_before else []
    if org:
        equipment = await Orm.update_equipment(
            equipment_id,
            org.id,
            name=patch.get("name"),
            description=patch.get("description"),
            characteristics=patch.get("characteristics"),
            image_urls=patch.get("image_urls"),
            laboratory_ids=laboratory_ids,
        )
    elif is_lab_representative(current_user):
        equipment = await Orm.update_equipment_for_creator(
            equipment_id,
            current_user.id,
            name=patch.get("name"),
            description=patch.get("description"),
            characteristics=patch.get("characteristics"),
            image_urls=patch.get("image_urls"),
            laboratory_ids=laboratory_ids,
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    new_lab_ids = [l.id for l in (equipment.laboratories or [])]
    lab_ids_to_reindex = list(set(old_lab_ids) | set(new_lab_ids))
    if lab_ids_to_reindex:
        await reindex_laboratories_by_ids(lab_ids_to_reindex)
    org_ids = list({l.organization_id for l in (equipment.laboratories or []) if getattr(l, "organization_id", None)})
    if org:
        org_ids = list(set(org_ids) | {org.id})
    if org_ids:
        try:
            await reindex_organizations_by_ids(org_ids)
        except Exception as e:
            logger.warning("Organization reindex failed after equipment update: %s", e)
    logger.info("Equipment updated: id=%s", equipment_id)
    return equipment


@router.delete("/organization/equipment/{equipment_id}")
async def delete_org_equipment(equipment_id: int, current_user=Depends(get_current_user)):
    org = await Orm.get_organization_for_user(current_user.id)
    equipment_before = None
    if org:
        equipment_before = await Orm.get_equipment(equipment_id, org.id)
        deleted = await Orm.delete_equipment(equipment_id, org.id)
    elif is_lab_representative(current_user):
        equipment_before = await Orm.get_equipment_for_creator(equipment_id, current_user.id)
        deleted = await Orm.delete_equipment_for_creator(equipment_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    lab_ids = [l.id for l in (equipment_before.laboratories or [])] if equipment_before else []
    if lab_ids:
        await reindex_laboratories_by_ids(lab_ids)
    if org:
        try:
            await reindex_organizations_by_ids([org.id])
        except Exception as e:
            logger.warning("Organization reindex failed after equipment delete: org_id=%s %s", org.id, e)
    logger.info("Equipment deleted: id=%s", equipment_id)
    return {"status": "ok"}
