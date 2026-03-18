"""Admin API: vacancy responses."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm

router = APIRouter(tags=["admin-vacancy-responses"])


@router.get("/vacancy-responses")
async def list_vacancy_responses_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    vacancy_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="new | accepted | rejected"),
    current_user=Depends(get_current_user),
):
    """List vacancy responses (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_vacancy_responses_admin(
        page=page,
        size=size,
        vacancy_id=vacancy_id,
        status_filter=status,
    )
    return {"items": items, "total": total, "page": page, "size": size}
