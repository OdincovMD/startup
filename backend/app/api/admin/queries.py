"""Admin API: queries CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import index_query, delete_query as es_delete_query
from app.roles.representative.schemas import OrganizationQueryUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-queries"])


def _query_to_read(q):
    """Serialize Query for admin response."""
    labs = getattr(q, "laboratories", None) or []
    emps = getattr(q, "employees", None) or []
    return {
        "id": q.id,
        "public_id": q.public_id,
        "title": q.title or "",
        "task_description": q.task_description,
        "completed_examples": getattr(q, "completed_examples", None),
        "grant_info": getattr(q, "grant_info", None),
        "budget": getattr(q, "budget", None),
        "deadline": getattr(q, "deadline", None),
        "status": q.status or "active",
        "is_published": getattr(q, "is_published", False),
        "created_at": q.created_at,
        "organization_id": q.organization_id,
        "creator_user_id": getattr(q, "creator_user_id", None),
        "linked_task_solution_id": getattr(q, "linked_task_solution_id", None),
        "laboratory_ids": [l.id for l in labs],
        "laboratories": [{"id": l.id, "name": l.name} for l in labs],
        "employee_ids": [e.id for e in emps],
        "employees": [{"id": e.id, "full_name": e.full_name} for e in emps],
    }


@router.get("/queries")
async def list_queries_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all queries (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_queries_admin(page=page, size=size)
    return {"items": [_query_to_read(q) for q in items], "total": total, "page": page, "size": size}


@router.get("/queries/{query_id}")
async def get_query_admin(
    query_id: int,
    current_user=Depends(get_current_user),
):
    """Get query by id (admin only)."""
    require_admin(current_user)
    q = await Orm.get_query_by_id(query_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    return _query_to_read(q)


@router.put("/queries/{query_id}")
async def update_query_admin(
    query_id: int,
    payload: OrganizationQueryUpdate,
    current_user=Depends(get_current_user),
):
    """Update query (admin only)."""
    require_admin(current_user)
    patch = payload.model_dump(exclude_unset=True)
    q = await Orm.admin_update_query(
        query_id,
        title=patch.get("title"),
        task_description=patch.get("task_description"),
        completed_examples=patch.get("completed_examples"),
        grant_info=patch.get("grant_info"),
        budget=patch.get("budget"),
        deadline=patch.get("deadline"),
        status=patch.get("status"),
        linked_task_solution_id=patch.get("linked_task_solution_id"),
        laboratory_ids=patch.get("laboratory_ids"),
        employee_ids=patch.get("employee_ids"),
        is_published=patch.get("is_published"),
    )
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    try:
        if getattr(q, "is_published", False):
            await index_query(query_id)
        else:
            await es_delete_query(query_id)
    except Exception as e:
        logger.warning("ES sync failed for query %s: %s", query_id, e)
    return _query_to_read(q)


@router.delete("/queries/{query_id}")
async def delete_query_admin(
    query_id: int,
    current_user=Depends(get_current_user),
):
    """Delete query (admin only)."""
    require_admin(current_user)
    q = await Orm.get_query_by_id(query_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    if q.organization_id is not None:
        ok = await Orm.delete_query(query_id, q.organization_id)
    elif getattr(q, "creator_user_id", None) is not None:
        ok = await Orm.delete_query_for_creator(query_id, q.creator_user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query has no organization or creator",
        )
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Query not found")
    try:
        await es_delete_query(query_id)
    except Exception as e:
        logger.warning("ES delete failed for query %s: %s", query_id, e)
    return {"ok": True}
