"""Admin API: lab and org join requests."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app import models
from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-join-requests"])


def _lab_request_to_item(req: models.LabJoinRequest) -> dict:
    researcher = req.researcher
    lab = req.laboratory
    org = getattr(lab, "organization", None) if lab else None
    return {
        "id": req.id,
        "researcher_id": req.researcher_id,
        "researcher_full_name": researcher.full_name if researcher else None,
        "researcher_user_id": researcher.user_id if researcher else None,
        "laboratory_id": req.laboratory_id,
        "laboratory_name": lab.name if lab else None,
        "organization_name": org.name if org else None,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None,
    }


def _org_request_to_item(req: models.OrgJoinRequest) -> dict:
    lab = req.laboratory
    org = req.organization
    return {
        "id": req.id,
        "laboratory_id": req.laboratory_id,
        "laboratory_name": lab.name if lab else None,
        "organization_id": req.organization_id,
        "organization_name": org.name if org else None,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None,
    }


@router.get("/join-requests/lab")
async def list_lab_join_requests_admin(
    status: Optional[str] = Query("pending", description="pending | all"),
    current_user=Depends(get_current_user),
):
    """List lab join requests (admin only)."""
    require_admin(current_user)
    status_filter = "pending" if status == "pending" else None
    items = await Orm.list_all_lab_join_requests_admin(status_filter=status_filter)
    return {"items": [_lab_request_to_item(r) for r in items]}


@router.get("/join-requests/org")
async def list_org_join_requests_admin(
    status: Optional[str] = Query("pending", description="pending | all"),
    current_user=Depends(get_current_user),
):
    """List org join requests (admin only)."""
    require_admin(current_user)
    status_filter = "pending" if status == "pending" else None
    items = await Orm.list_all_org_join_requests_admin(status_filter=status_filter)
    return {"items": [_org_request_to_item(r) for r in items]}


@router.post("/join-requests/lab/{request_id}/approve")
async def approve_lab_join_request_admin(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Approve lab join request (admin only)."""
    require_admin(current_user)
    req = await Orm.approve_lab_join_request(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already resolved")
    logger.info("Lab join request approved: id=%s by admin_id=%s", request_id, current_user.id)
    return {"id": req.id, "status": "approved"}


@router.post("/join-requests/lab/{request_id}/reject")
async def reject_lab_join_request_admin(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Reject lab join request (admin only)."""
    require_admin(current_user)
    req = await Orm.reject_lab_join_request(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already resolved")
    logger.info("Lab join request rejected: id=%s by admin_id=%s", request_id, current_user.id)
    return {"id": req.id, "status": "rejected"}


@router.post("/join-requests/org/{request_id}/approve")
async def approve_org_join_request_admin(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Approve org join request (admin only)."""
    require_admin(current_user)
    req = await Orm.approve_org_join_request(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already resolved")
    logger.info("Org join request approved: id=%s by admin_id=%s", request_id, current_user.id)
    return {"id": req.id, "status": "approved"}


@router.post("/join-requests/org/{request_id}/reject")
async def reject_org_join_request_admin(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Reject org join request (admin only)."""
    require_admin(current_user)
    req = await Orm.reject_org_join_request(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already resolved")
    logger.info("Org join request rejected: id=%s by admin_id=%s", request_id, current_user.id)
    return {"id": req.id, "status": "rejected"}
