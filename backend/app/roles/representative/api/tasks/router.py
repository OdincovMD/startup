"""Tasks view — CRUD для задач (task solutions)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.roles.representative.schemas import (
    OrganizationTaskSolutionCreate,
    OrganizationTaskSolutionRead,
    OrganizationTaskSolutionUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.async_orm import AsyncOrm

router = APIRouter()


@router.get("/organization/tasks", response_model=list[OrganizationTaskSolutionRead])
async def list_org_tasks(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.list_task_solutions_for_org(org.id)
    if is_lab_representative(current_user):
        return await AsyncOrm.list_task_solutions_for_creator(current_user.id)
    return []


@router.post("/organization/tasks", response_model=OrganizationTaskSolutionRead)
async def create_org_task(
    payload: OrganizationTaskSolutionCreate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.create_task_solution_for_org(
            org.id,
            creator_user_id=current_user.id,
            title=payload.title,
            task_description=payload.task_description,
            solution_description=payload.solution_description,
            article_links=payload.article_links,
            solution_deadline=payload.solution_deadline,
            grant_info=payload.grant_info,
            cost=payload.cost,
            external_solutions=payload.external_solutions,
            laboratory_ids=payload.laboratory_ids,
        )
    if is_lab_representative(current_user):
        require_lab_link_for_lab_rep(payload.laboratory_ids)
        return await AsyncOrm.create_task_solution_for_org(
            None,
            creator_user_id=current_user.id,
            title=payload.title,
            task_description=payload.task_description,
            solution_description=payload.solution_description,
            article_links=payload.article_links,
            solution_deadline=payload.solution_deadline,
            grant_info=payload.grant_info,
            cost=payload.cost,
            external_solutions=payload.external_solutions,
            laboratory_ids=payload.laboratory_ids,
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Сначала заполните и сохраните профиль организации.",
    )


@router.put("/organization/tasks/{task_id}", response_model=OrganizationTaskSolutionRead)
async def update_org_task(
    task_id: int,
    payload: OrganizationTaskSolutionUpdate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_ids = patch.get("laboratory_ids")
    if is_lab_representative(current_user) and "laboratory_ids" in patch:
        require_lab_link_for_lab_rep(laboratory_ids=laboratory_ids)
    if org:
        task = await AsyncOrm.update_task_solution(
            task_id,
            org.id,
            title=patch.get("title"),
            task_description=patch.get("task_description"),
            solution_description=patch.get("solution_description"),
            article_links=patch.get("article_links"),
            solution_deadline=patch.get("solution_deadline"),
            grant_info=patch.get("grant_info"),
            cost=patch.get("cost"),
            external_solutions=patch.get("external_solutions"),
            laboratory_ids=laboratory_ids,
        )
    elif is_lab_representative(current_user):
        task = await AsyncOrm.update_task_solution_for_creator(
            task_id,
            current_user.id,
            title=patch.get("title"),
            task_description=patch.get("task_description"),
            solution_description=patch.get("solution_description"),
            article_links=patch.get("article_links"),
            solution_deadline=patch.get("solution_deadline"),
            grant_info=patch.get("grant_info"),
            cost=patch.get("cost"),
            external_solutions=patch.get("external_solutions"),
            laboratory_ids=laboratory_ids,
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.delete("/organization/tasks/{task_id}")
async def delete_org_task(task_id: int, current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        deleted = await AsyncOrm.delete_task_solution(task_id, org.id)
    elif is_lab_representative(current_user):
        deleted = await AsyncOrm.delete_task_solution_for_creator(task_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return {"status": "ok"}
