"""Admin API: creator-scoped data for entities without organization_id."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm

router = APIRouter(tags=["admin-creators"])


@router.get("/creators/{user_id}/laboratories")
async def list_creator_laboratories_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """List laboratories of a creator (lab_rep without org, admin only)."""
    require_admin(current_user)
    labs = await Orm.list_laboratories_for_creator(user_id)
    return {
        "items": [
            {"id": lab.id, "public_id": lab.public_id, "name": lab.name}
            for lab in labs
        ]
    }


@router.get("/creators/{user_id}/queries")
async def list_creator_queries_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """List queries of a creator (admin only)."""
    require_admin(current_user)
    queries = await Orm.list_queries_for_creator(user_id)
    return {
        "items": [
            {"id": q.id, "public_id": q.public_id, "title": q.title or ""}
            for q in queries
        ]
    }


@router.get("/creators/{user_id}/employees")
async def list_creator_employees_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """List employees of a creator (admin only)."""
    require_admin(current_user)
    employees = await Orm.list_employees_for_creator(user_id)
    return {
        "items": [
            {"id": e.id, "full_name": e.full_name or ""}
            for e in employees
        ]
    }


@router.get("/creators/{user_id}/equipment")
async def list_creator_equipment_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """List equipment of a creator (admin only)."""
    require_admin(current_user)
    equipment = await Orm.list_equipment_for_creator(user_id)
    return {
        "items": [
            {"id": e.id, "name": e.name or ""}
            for e in equipment
        ]
    }


@router.get("/creators/{user_id}/tasks")
async def list_creator_tasks_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """List task solutions of a creator (admin only)."""
    require_admin(current_user)
    tasks = await Orm.list_task_solutions_for_creator(user_id)
    return {
        "items": [
            {"id": t.id, "title": t.title or ""}
            for t in tasks
        ]
    }
