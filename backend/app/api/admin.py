"""
Admin API for manual subscription management.
Platform admin endpoints for activating, extending, and cancelling user subscriptions.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.queries.orm import Orm

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user):
    """Raise 403 if user is not a platform_admin."""
    if not user.role or user.role.name != "platform_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )


class SubscriptionCreate(BaseModel):
    user_id: int
    audience: str = "representative"
    expires_at: Optional[datetime] = None


class SubscriptionExtend(BaseModel):
    new_expires_at: datetime


@router.post("/subscriptions")
async def create_subscription(
    body: SubscriptionCreate,
    current_user=Depends(get_current_user),
):
    """Activate a subscription for a user (admin only)."""
    _require_admin(current_user)
    target_user = await Orm.get_user(body.user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    existing = await Orm.get_active_subscription(body.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active subscription",
        )
    sub = await Orm.create_subscription(
        user_id=body.user_id,
        audience=body.audience,
        expires_at=body.expires_at,
        activated_by=current_user.id,
    )
    logger.info(
        "Subscription created: sub_id=%s user_id=%s by admin_id=%s",
        sub.id, body.user_id, current_user.id,
    )
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "audience": sub.audience,
        "status": sub.status,
        "started_at": sub.started_at,
        "expires_at": sub.expires_at,
        "activated_by": sub.activated_by,
    }


@router.post("/subscriptions/{subscription_id}/extend")
async def extend_subscription(
    subscription_id: int,
    body: SubscriptionExtend,
    current_user=Depends(get_current_user),
):
    """Extend a subscription's expiration date (admin only)."""
    _require_admin(current_user)
    sub = await Orm.extend_subscription(
        subscription_id=subscription_id,
        new_expires_at=body.new_expires_at,
        performed_by=current_user.id,
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    logger.info(
        "Subscription extended: sub_id=%s new_expires=%s by admin_id=%s",
        sub.id, body.new_expires_at, current_user.id,
    )
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "status": sub.status,
        "expires_at": sub.expires_at,
    }


@router.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: int,
    current_user=Depends(get_current_user),
):
    """Cancel a subscription (admin only)."""
    _require_admin(current_user)
    sub = await Orm.cancel_subscription(
        subscription_id=subscription_id,
        performed_by=current_user.id,
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    logger.info(
        "Subscription cancelled: sub_id=%s by admin_id=%s",
        sub.id, current_user.id,
    )
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "status": sub.status,
        "cancelled_at": sub.cancelled_at,
    }


@router.get("/subscriptions/user/{user_id}")
async def get_user_subscriptions(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """Get all subscriptions for a user (admin only)."""
    _require_admin(current_user)
    subs = await Orm.list_subscriptions_for_user(user_id)
    return {
        "items": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "audience": s.audience,
                "status": s.status,
                "started_at": s.started_at,
                "expires_at": s.expires_at,
                "activated_by": s.activated_by,
                "cancelled_at": s.cancelled_at,
                "created_at": s.created_at,
            }
            for s in subs
        ]
    }


@router.get("/subscriptions/{subscription_id}/events")
async def get_subscription_events(
    subscription_id: int,
    current_user=Depends(get_current_user),
):
    """Get audit trail for a subscription (admin only)."""
    _require_admin(current_user)
    events = await Orm.list_subscription_events(subscription_id)
    return {
        "items": [
            {
                "id": e.id,
                "subscription_id": e.subscription_id,
                "event_type": e.event_type,
                "performed_by": e.performed_by,
                "details": e.details,
                "created_at": e.created_at,
            }
            for e in events
        ]
    }
