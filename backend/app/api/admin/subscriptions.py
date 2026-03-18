"""Admin API: subscriptions management."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-subscriptions"])


@router.get("/users/search")
async def search_users_for_subscription(
    q: str = "",
    limit: int = 15,
    current_user=Depends(get_current_user),
):
    """Search users by email or name for subscription assignment (admin only)."""
    require_admin(current_user)
    if not q or len(q.strip()) < 2:
        return {"items": []}
    users = await Orm.search_users_admin(q.strip(), limit=limit)
    return {
        "items": [
            {"id": u.id, "full_name": u.full_name or "", "mail": u.mail or ""}
            for u in users
        ]
    }


class SubscriptionCreate(BaseModel):
    user_id: int
    audience: str = "representative"
    tier: str = "pro"
    expires_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None


class SubscriptionExtend(BaseModel):
    new_expires_at: datetime


class SubscriptionRequestApprove(BaseModel):
    expires_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None


class SubscriptionRequestReject(BaseModel):
    reason: Optional[str] = None


@router.post("/subscriptions")
async def create_subscription(
    body: SubscriptionCreate,
    current_user=Depends(get_current_user),
):
    """Activate a subscription for a user (admin only). Cancels any existing active sub."""
    require_admin(current_user)
    target_user = await Orm.get_user(body.user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await Orm.cancel_active_subscriptions_for_user(body.user_id, performed_by=current_user.id)
    sub = await Orm.create_subscription(
        user_id=body.user_id,
        audience=body.audience,
        tier=body.tier,
        expires_at=body.expires_at,
        trial_ends_at=body.trial_ends_at,
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
        "tier": sub.tier,
        "status": sub.status,
        "started_at": sub.started_at,
        "expires_at": sub.expires_at,
        "trial_ends_at": sub.trial_ends_at,
        "activated_by": sub.activated_by,
    }


@router.post("/subscriptions/{subscription_id}/extend")
async def extend_subscription(
    subscription_id: int,
    body: SubscriptionExtend,
    current_user=Depends(get_current_user),
):
    """Extend a subscription's expiration date (admin only)."""
    require_admin(current_user)
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
    require_admin(current_user)
    sub = await Orm.cancel_subscription(
        subscription_id=subscription_id,
        performed_by=current_user.id,
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    await Orm.create_notification(
        sub.user_id,
        "subscription_cancelled",
        {
            "subscription_id": sub.id,
            "tier": sub.tier,
            "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        },
    )
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
    require_admin(current_user)
    target_user = await Orm.get_user(user_id)
    subs = await Orm.list_subscriptions_for_user(user_id)
    return {
        "user": {
            "id": user_id,
            "full_name": getattr(target_user, "full_name", None) if target_user else None,
            "mail": getattr(target_user, "mail", None) if target_user else None,
        } if target_user else None,
        "items": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "audience": s.audience,
                "tier": s.tier,
                "status": s.status,
                "started_at": s.started_at,
                "expires_at": s.expires_at,
                "trial_ends_at": s.trial_ends_at,
                "activated_by": s.activated_by,
                "cancelled_at": s.cancelled_at,
                "discount_percent": s.discount_percent,
                "renewal_count": s.renewal_count,
                "created_at": s.created_at,
            }
            for s in subs
        ]
    }


@router.get("/subscription-requests")
async def list_subscription_requests(
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """List subscription requests (admin only). status=pending|approved|rejected|all. Default: pending."""
    require_admin(current_user)
    status_filter = None if status == "all" or status == "" else (status or "pending")
    rows = await Orm.list_subscription_requests(
        status_filter=status_filter,
        limit=100,
    )
    items = []
    for req, u in rows:
        items.append({
            "id": req.id,
            "user_id": req.user_id,
            "user_full_name": u.full_name,
            "user_mail": u.mail,
            "audience": req.audience,
            "tier": req.tier,
            "is_trial": req.is_trial,
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
        })
    return {"items": items}


@router.post("/subscription-requests/{request_id}/approve")
async def approve_subscription_request(
    request_id: int,
    body: SubscriptionRequestApprove,
    current_user=Depends(get_current_user),
):
    """Approve a subscription request (admin only). Creates subscription."""
    require_admin(current_user)
    result = await Orm.approve_subscription_request(
        request_id=request_id,
        resolved_by=current_user.id,
        expires_at=body.expires_at,
        trial_ends_at=body.trial_ends_at,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already resolved")
    req, sub = result["request"], result["subscription"]
    await Orm.delete_subscription_request_notifications(request_id)
    await Orm.create_notification(
        req.user_id,
        "subscription_request_approved",
        {
            "request_id": req.id,
            "subscription_id": sub.id,
            "tier": sub.tier,
            "is_trial": req.is_trial,
        },
    )
    logger.info(
        "Subscription request approved: req_id=%s user_id=%s sub_id=%s by admin_id=%s",
        request_id, req.user_id, sub.id, current_user.id,
    )
    return {
        "request_id": req.id,
        "subscription_id": sub.id,
        "user_id": sub.user_id,
        "tier": sub.tier,
        "status": sub.status,
    }


@router.post("/subscription-requests/{request_id}/reject")
async def reject_subscription_request(
    request_id: int,
    body: Optional[SubscriptionRequestReject] = None,
    current_user=Depends(get_current_user),
):
    """Reject a subscription request (admin only)."""
    require_admin(current_user)
    reason = (body.reason if body else None) or ""
    req = await Orm.reject_subscription_request(
        request_id=request_id,
        resolved_by=current_user.id,
        rejection_reason=reason or None,
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already resolved")
    await Orm.delete_subscription_request_notifications(request_id)
    await Orm.create_notification(
        req.user_id,
        "subscription_request_rejected",
        {
            "request_id": req.id,
            "tier": req.tier,
            "is_trial": req.is_trial,
            "reason": reason or None,
        },
    )
    logger.info(
        "Subscription request rejected: req_id=%s user_id=%s by admin_id=%s",
        request_id, req.user_id, current_user.id,
    )
    return {"request_id": req.id, "status": "rejected"}


@router.get("/subscriptions/{subscription_id}/events")
async def get_subscription_events(
    subscription_id: int,
    current_user=Depends(get_current_user),
):
    """Get audit trail for a subscription (admin only)."""
    require_admin(current_user)
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
