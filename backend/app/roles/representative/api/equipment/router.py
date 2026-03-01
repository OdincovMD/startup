"""Equipment view — CRUD для оборудования."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.roles.representative.schemas import (
    OrganizationEquipmentCreate,
    OrganizationEquipmentRead,
    OrganizationEquipmentUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.async_orm import AsyncOrm

router = APIRouter()


@router.get("/organization/equipment", response_model=list[OrganizationEquipmentRead])
async def list_org_equipment(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.list_equipment_for_org(org.id)
    if is_lab_representative(current_user):
        return await AsyncOrm.list_equipment_for_creator(current_user.id)
    return []


@router.post("/organization/equipment", response_model=OrganizationEquipmentRead)
async def create_org_equipment(
    payload: OrganizationEquipmentCreate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        eq = await AsyncOrm.create_equipment_for_org(
            org.id,
            creator_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            characteristics=payload.characteristics,
            image_urls=payload.image_urls,
            laboratory_ids=payload.laboratory_ids,
        )
        logger.info("Equipment created: id=%s org_id=%s", eq.id, org.id)
        return eq
    if is_lab_representative(current_user):
        require_lab_link_for_lab_rep(payload.laboratory_ids)
        eq = await AsyncOrm.create_equipment_for_org(
            None,
            creator_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            characteristics=payload.characteristics,
            image_urls=payload.image_urls,
            laboratory_ids=payload.laboratory_ids,
        )
        logger.info("Equipment created: id=%s creator_user_id=%s", eq.id, current_user.id)
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
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_ids = patch.get("laboratory_ids")
    if is_lab_representative(current_user) and "laboratory_ids" in patch:
        require_lab_link_for_lab_rep(laboratory_ids=laboratory_ids)
    if org:
        equipment = await AsyncOrm.update_equipment(
            equipment_id,
            org.id,
            name=patch.get("name"),
            description=patch.get("description"),
            characteristics=patch.get("characteristics"),
            image_urls=patch.get("image_urls"),
            laboratory_ids=laboratory_ids,
        )
    elif is_lab_representative(current_user):
        equipment = await AsyncOrm.update_equipment_for_creator(
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
    logger.info("Equipment updated: id=%s", equipment_id)
    return equipment


@router.delete("/organization/equipment/{equipment_id}")
async def delete_org_equipment(equipment_id: int, current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        deleted = await AsyncOrm.delete_equipment(equipment_id, org.id)
    elif is_lab_representative(current_user):
        deleted = await AsyncOrm.delete_equipment_for_creator(equipment_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    logger.info("Equipment deleted: id=%s", equipment_id)
    return {"status": "ok"}
