"""Admin API: researchers CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import index_applicant, delete_applicant
from app.roles.researcher.schemas import ResearcherUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-researchers"])


def _researcher_to_read(user, researcher):
    """Serialize researcher for admin response."""
    return {
        "user_id": user.id,
        "public_id": user.public_id,
        "full_name": researcher.full_name if researcher else (user.full_name or ""),
        "position": getattr(researcher, "position", None),
        "academic_degree": getattr(researcher, "academic_degree", None),
        "research_interests": getattr(researcher, "research_interests", None) or [],
        "education": getattr(researcher, "education", None) or [],
        "resume_url": getattr(researcher, "resume_url", None),
        "is_published": getattr(researcher, "is_published", False),
        "created_at": user.created_at,
    }


@router.get("/researchers")
async def list_researchers_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all researchers (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_researchers_admin(page=page, size=size)
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/researchers/{user_id}")
async def get_researcher_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """Get researcher by user_id (admin only)."""
    require_admin(current_user)
    user = await Orm.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    researcher = await Orm.get_researcher_by_user(user_id)
    if not researcher or (user.role and user.role.name != "researcher"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Researcher not found")
    return _researcher_to_read(user, researcher)


@router.put("/researchers/{user_id}")
async def update_researcher_admin(
    user_id: int,
    payload: ResearcherUpdate,
    current_user=Depends(get_current_user),
):
    """Update researcher (admin only)."""
    require_admin(current_user)
    user = await Orm.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    researcher = await Orm.get_researcher_by_user(user_id)
    if not researcher or (user.role and user.role.name != "researcher"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Researcher not found")
    patch = payload.model_dump(exclude_unset=True)
    patch.pop("laboratory_ids", None)
    await Orm.upsert_researcher_profile(user_id, **patch)
    try:
        researcher_after = await Orm.get_researcher_by_user(user_id)
        if researcher_after and getattr(researcher_after, "is_published", False):
            await index_applicant(user_id)
        else:
            await delete_applicant(user_id)
    except Exception as e:
        logger.warning("ES sync failed for researcher %s: %s", user_id, e)
    user = await Orm.get_user(user_id)
    researcher = await Orm.get_researcher_by_user(user_id)
    return _researcher_to_read(user, researcher)


@router.delete("/researchers/{user_id}")
async def delete_researcher_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """Delete researcher profile (admin only). User remains, researcher profile is removed."""
    require_admin(current_user)
    user = await Orm.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    researcher = await Orm.get_researcher_by_user(user_id)
    if not researcher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Researcher not found")
    await Orm.delete_researcher_profile(user_id)
    try:
        await delete_applicant(user_id)
    except Exception as e:
        logger.warning("ES delete failed for researcher %s: %s", user_id, e)
    return {"ok": True}
