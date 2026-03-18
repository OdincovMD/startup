"""Admin API: users management."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-users"])


class UserBlockRequest(BaseModel):
    blocked: bool


@router.get("/users")
async def list_users_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None, description="Filter by role: platform_admin, lab_representative, researcher, student"),
    q: Optional[str] = Query(None, description="Search by email or full_name"),
    current_user=Depends(get_current_user),
):
    """List all users with pagination and filters (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_users_admin(page=page, size=size, role_filter=role, q=q)
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: int,
    body: UserBlockRequest,
    current_user=Depends(get_current_user),
):
    """Block or unblock a user (admin only). Blocking invalidates existing JWT."""
    require_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")
    user = await Orm.set_user_blocked(user_id, body.blocked)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    logger.info("User %s: user_id=%s by admin_id=%s", "blocked" if body.blocked else "unblocked", user_id, current_user.id)
    return {"user_id": user_id, "is_blocked": user.is_blocked}


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """Send password reset email to user (admin only)."""
    require_admin(current_user)
    reset_url = await Orm.admin_trigger_password_reset(user_id)
    if not reset_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or email not verified",
        )
    logger.info("Admin triggered password reset: user_id=%s by admin_id=%s", user_id, current_user.id)
    return {"detail": "Password reset email sent", "user_id": user_id}
