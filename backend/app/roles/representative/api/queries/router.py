"""Queries view — CRUD для запросов организации."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.roles.representative.schemas import (
    OrganizationQueryCreate,
    OrganizationQueryRead,
    OrganizationQueryUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.async_orm import AsyncOrm

router = APIRouter()


class PublishToggle(BaseModel):
    is_published: bool


@router.get("/organization/queries", response_model=list[OrganizationQueryRead])
async def list_org_queries(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.list_queries_for_org(org.id)
    if is_lab_representative(current_user):
        return await AsyncOrm.list_queries_for_creator(current_user.id)
    return []


@router.post("/organization/queries", response_model=OrganizationQueryRead)
async def create_org_query(
    payload: OrganizationQueryCreate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.create_query_for_org(
            org.id,
            creator_user_id=current_user.id,
            title=payload.title,
            task_description=payload.task_description,
            completed_examples=payload.completed_examples,
            grant_info=payload.grant_info,
            budget=payload.budget,
            deadline=payload.deadline,
            status=payload.status,
            linked_task_solution_id=payload.linked_task_solution_id,
            laboratory_ids=payload.laboratory_ids,
            employee_ids=payload.employee_ids,
        )
    if is_lab_representative(current_user):
        require_lab_link_for_lab_rep(payload.laboratory_ids)
        return await AsyncOrm.create_query_for_org(
            None,
            creator_user_id=current_user.id,
            title=payload.title,
            task_description=payload.task_description,
            completed_examples=payload.completed_examples,
            grant_info=payload.grant_info,
            budget=payload.budget,
            deadline=payload.deadline,
            status=payload.status,
            linked_task_solution_id=payload.linked_task_solution_id,
            laboratory_ids=payload.laboratory_ids,
            employee_ids=payload.employee_ids,
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Сначала заполните и сохраните профиль организации.",
    )


@router.put("/organization/queries/{query_id}", response_model=OrganizationQueryRead)
async def update_org_query(
    query_id: int,
    payload: OrganizationQueryUpdate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_ids = patch.get("laboratory_ids")
    employee_ids = patch.get("employee_ids")
    if is_lab_representative(current_user) and "laboratory_ids" in patch:
        require_lab_link_for_lab_rep(laboratory_ids=laboratory_ids)
    # Проверка: нельзя удалять лабораторию у опубликованного запроса
    query_before = None
    if org:
        query_before = await AsyncOrm.get_query_for_org(query_id, org.id)
    elif is_lab_representative(current_user):
        query_before = await AsyncOrm.get_query_for_creator(query_id, current_user.id)
    if query_before and getattr(query_before, "is_published", False) and "laboratory_ids" in patch:
        new_labs = laboratory_ids if laboratory_ids is not None else []
        if not new_labs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Снимите запрос с публикации, затем удалите лабораторию.",
            )
    if org:
        query = await AsyncOrm.update_query(
            query_id,
            org.id,
            title=patch.get("title"),
            task_description=patch.get("task_description"),
            completed_examples=patch.get("completed_examples"),
            grant_info=patch.get("grant_info"),
            budget=patch.get("budget"),
            deadline=patch.get("deadline"),
            status=patch.get("status"),
            linked_task_solution_id=patch.get("linked_task_solution_id"),
            laboratory_ids=laboratory_ids,
            employee_ids=employee_ids,
        )
    elif is_lab_representative(current_user):
        query = await AsyncOrm.update_query_for_creator(
            query_id,
            current_user.id,
            title=patch.get("title"),
            task_description=patch.get("task_description"),
            completed_examples=patch.get("completed_examples"),
            grant_info=patch.get("grant_info"),
            budget=patch.get("budget"),
            deadline=patch.get("deadline"),
            status=patch.get("status"),
            linked_task_solution_id=patch.get("linked_task_solution_id"),
            laboratory_ids=laboratory_ids,
            employee_ids=employee_ids,
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not query:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    return query


@router.delete("/organization/queries/{query_id}")
async def delete_org_query(query_id: int, current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        deleted = await AsyncOrm.delete_query(query_id, org.id)
    elif is_lab_representative(current_user):
        deleted = await AsyncOrm.delete_query_for_creator(query_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    return {"status": "ok"}


@router.put("/organization/queries/{query_id}/publish", response_model=OrganizationQueryRead)
async def set_query_publish_state(
    query_id: int,
    payload: PublishToggle,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    query_before = None
    if org:
        query_before = await AsyncOrm.get_query_for_org(query_id, org.id)
    elif is_lab_representative(current_user):
        query_before = await AsyncOrm.get_query_for_creator(query_id, current_user.id)
    if not query_before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    if payload.is_published:
        labs = getattr(query_before, "laboratories", None) or []
        if not labs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя опубликовать запрос без лаборатории. Привяжите хотя бы одну лабораторию.",
            )
    if org:
        query = await AsyncOrm.set_query_published(query_id, org.id, payload.is_published)
    else:
        query = await AsyncOrm.set_query_published_for_creator(
            query_id, current_user.id, payload.is_published
        )
    return query
