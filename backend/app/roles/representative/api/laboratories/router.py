"""Laboratories view — CRUD для лабораторий."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user


class PublishToggle(BaseModel):
    is_published: bool
from app.roles.representative.schemas import (
    OrganizationLaboratoryCreate,
    OrganizationLaboratoryRead,
    OrganizationLaboratoryUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative
from app.queries.async_orm import AsyncOrm

router = APIRouter()


def _filter_duplicate_researchers(labs):
    """Убирает исследователей, которые уже в сотрудниках (дубликат при approve)."""
    for lab in labs:
        employee_user_ids = {e.user_id for e in (lab.employees or []) if getattr(e, "user_id", None)}
        lab.researchers = [r for r in (lab.researchers or []) if getattr(r, "user_id", None) not in employee_user_ids]
    return labs


@router.get("/organization/laboratories", response_model=list[OrganizationLaboratoryRead])
async def list_org_laboratories(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        labs = await AsyncOrm.list_laboratories_for_org(org.id)
    elif is_lab_representative(current_user):
        labs = await AsyncOrm.list_laboratories_for_creator(current_user.id)
    else:
        return []
    return _filter_duplicate_researchers(labs)


@router.post("/organization/laboratories", response_model=OrganizationLaboratoryRead)
async def create_org_laboratory(
    payload: OrganizationLaboratoryCreate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.create_laboratory_for_org(
            org.id,
            creator_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            activities=payload.activities,
            image_urls=payload.image_urls,
            employee_ids=payload.employee_ids,
            head_employee_id=payload.head_employee_id,
            equipment_ids=payload.equipment_ids,
            task_solution_ids=payload.task_solution_ids,
        )
    if is_lab_representative(current_user):
        return await AsyncOrm.create_laboratory_for_org(
            None,
            creator_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            activities=payload.activities,
            image_urls=payload.image_urls,
            employee_ids=payload.employee_ids,
            head_employee_id=payload.head_employee_id,
            equipment_ids=payload.equipment_ids,
            task_solution_ids=payload.task_solution_ids,
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Organization profile not found. Сначала заполните и сохраните профиль организации.",
    )


@router.put("/organization/laboratories/{laboratory_id}", response_model=OrganizationLaboratoryRead)
async def update_org_laboratory(
    laboratory_id: int,
    payload: OrganizationLaboratoryUpdate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        lab = await AsyncOrm.update_laboratory(
            laboratory_id,
            org.id,
            name=payload.name,
            description=payload.description,
            activities=payload.activities,
            image_urls=payload.image_urls,
            employee_ids=payload.employee_ids,
            head_employee_id=payload.head_employee_id,
            equipment_ids=payload.equipment_ids,
            task_solution_ids=payload.task_solution_ids,
        )
    elif is_lab_representative(current_user):
        lab = await AsyncOrm.update_laboratory_for_creator(
            laboratory_id,
            current_user.id,
            name=payload.name,
            description=payload.description,
            activities=payload.activities,
            image_urls=payload.image_urls,
            employee_ids=payload.employee_ids,
            head_employee_id=payload.head_employee_id,
            equipment_ids=payload.equipment_ids,
            task_solution_ids=payload.task_solution_ids,
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laboratory not found")
    return lab


@router.delete("/organization/laboratories/{laboratory_id}")
async def delete_org_laboratory(laboratory_id: int, current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        deleted, lab_rep_user_id, lab_name = await AsyncOrm.delete_laboratory(
            laboratory_id, org.id
        )
    elif is_lab_representative(current_user):
        deleted, lab_rep_user_id, lab_name = await AsyncOrm.delete_laboratory_for_creator(
            laboratory_id, current_user.id
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laboratory not found")
    # Уведомление представителю лаборатории о том, что лаборатория удалена/отвязана
    if lab_rep_user_id and lab_name:
        await AsyncOrm.create_notification(
            lab_rep_user_id,
            "lab_deleted",
            {"lab_name": lab_name},
        )
    return {"status": "ok"}


@router.put("/organization/laboratories/{laboratory_id}/publish", response_model=OrganizationLaboratoryRead)
async def set_lab_publish_state(
    laboratory_id: int,
    payload: PublishToggle,
    current_user=Depends(get_current_user),
):
    is_published = payload.is_published
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        lab = await AsyncOrm.set_laboratory_published(laboratory_id, org.id, is_published)
    elif is_lab_representative(current_user):
        lab = await AsyncOrm.set_laboratory_published_for_creator(
            laboratory_id, current_user.id, is_published
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laboratory not found")
    return lab
