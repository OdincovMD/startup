"""Admin API: task solutions CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import reindex_laboratories_by_ids, reindex_organizations_by_ids
from app.roles.representative.schemas import OrganizationTaskSolutionUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-tasks"])


def _task_to_read(task, for_list=False):
    """Serialize task solution for admin response."""
    org = getattr(task, "organization", None)
    labs = getattr(task, "laboratories", None) or []
    out = {
        "id": task.id,
        "title": task.title or "",
        "task_description": getattr(task, "task_description", None),
        "solution_description": getattr(task, "solution_description", None),
        "article_links": getattr(task, "article_links", None) or [],
        "solution_deadline": getattr(task, "solution_deadline", None),
        "grant_info": getattr(task, "grant_info", None),
        "cost": getattr(task, "cost", None),
        "external_solutions": getattr(task, "external_solutions", None),
        "organization_id": getattr(task, "organization_id", None),
        "creator_user_id": getattr(task, "creator_user_id", None),
        "organization_name": org.name if org else None,
        "created_at": getattr(task, "created_at", None),
        "laboratory_ids": [lab.id for lab in labs],
    }
    if not for_list:
        out["laboratories"] = [{"id": lab.id, "name": lab.name, "public_id": lab.public_id} for lab in labs]
    return out


@router.get("/tasks")
async def list_tasks_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all task solutions (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_task_solutions_admin(page=page, size=size)
    return {
        "items": [_task_to_read(t, for_list=True) for t in items],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/tasks/{task_id}")
async def get_task_admin(
    task_id: int,
    current_user=Depends(get_current_user),
):
    """Get task solution by id (admin only)."""
    require_admin(current_user)
    task = await Orm.admin_get_task_solution(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _task_to_read(task)


@router.put("/tasks/{task_id}")
async def update_task_admin(
    task_id: int,
    payload: OrganizationTaskSolutionUpdate,
    current_user=Depends(get_current_user),
):
    """Update task solution (admin only)."""
    require_admin(current_user)
    task = await Orm.admin_get_task_solution(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    patch = payload.model_dump(exclude_unset=True)
    task = await Orm.admin_update_task_solution(task_id, **patch)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    lab_ids = [l.id for l in (task.laboratories or [])]
    if lab_ids:
        try:
            await reindex_laboratories_by_ids(lab_ids)
            if task.organization_id:
                await reindex_organizations_by_ids([task.organization_id])
        except Exception as e:
            logger.warning("ES sync failed after task update: %s", e)
    return _task_to_read(task)


@router.delete("/tasks/{task_id}")
async def delete_task_admin(
    task_id: int,
    current_user=Depends(get_current_user),
):
    """Delete task solution (admin only)."""
    require_admin(current_user)
    task = await Orm.admin_get_task_solution(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    lab_ids = [l.id for l in (task.laboratories or [])]
    org_id = getattr(task, "organization_id", None)
    ok = await Orm.admin_delete_task_solution(task_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if lab_ids:
        try:
            await reindex_laboratories_by_ids(lab_ids)
            if org_id:
                await reindex_organizations_by_ids([org_id])
        except Exception as e:
            logger.warning("ES sync failed after task delete: %s", e)
    return {"ok": True}
