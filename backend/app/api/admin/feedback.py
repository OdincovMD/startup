"""Admin API: feedback reports moderation."""

from fastapi import APIRouter, Depends, Query

from app.api.admin.deps import require_admin
from app.api.deps import get_current_user
from app.api.feedback import get_feedback_or_404, list_feedback_paginated, update_feedback_status
from app.core.schemas import FeedbackListResponse, FeedbackRead, FeedbackStatusUpdate

router = APIRouter(tags=["admin-feedback"])


@router.get("/feedback", response_model=FeedbackListResponse)
async def list_feedback_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, pattern="^(new|done)$"),
    current_user=Depends(get_current_user),
):
    require_admin(current_user)
    items, total = await list_feedback_paginated(page=page, size=size, feedback_status=status)
    return FeedbackListResponse(items=items, total=total, page=page, size=size)


@router.get("/feedback/{feedback_id}", response_model=FeedbackRead)
async def get_feedback_admin(
    feedback_id: int,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)
    return await get_feedback_or_404(feedback_id)


@router.patch("/feedback/{feedback_id}/status", response_model=FeedbackRead)
async def patch_feedback_status_admin(
    feedback_id: int,
    payload: FeedbackStatusUpdate,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)
    return await update_feedback_status(feedback_id, payload.status)
