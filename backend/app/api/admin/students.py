"""Admin API: students CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import index_applicant, delete_applicant
from app.roles.student.schemas import StudentUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-students"])


def _student_to_read(user, student):
    """Serialize student for admin response."""
    return {
        "user_id": user.id,
        "public_id": user.public_id,
        "full_name": student.full_name if student else (user.full_name or ""),
        "status": getattr(student, "status", None),
        "skills": getattr(student, "skills", None) or [],
        "summary": getattr(student, "summary", None),
        "resume_url": getattr(student, "resume_url", None),
        "education": getattr(student, "education", None) or [],
        "research_interests": getattr(student, "research_interests", None) or [],
        "is_published": getattr(student, "is_published", False),
        "created_at": user.created_at,
    }


@router.get("/students")
async def list_students_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all students (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_students_admin(page=page, size=size)
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/students/{user_id}")
async def get_student_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """Get student by user_id (admin only)."""
    require_admin(current_user)
    user = await Orm.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    student = await Orm.get_student_by_user(user_id)
    if not student or (user.role and user.role.name != "student"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return _student_to_read(user, student)


@router.put("/students/{user_id}")
async def update_student_admin(
    user_id: int,
    payload: StudentUpdate,
    current_user=Depends(get_current_user),
):
    """Update student (admin only)."""
    require_admin(current_user)
    user = await Orm.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    student = await Orm.get_student_by_user(user_id)
    if not student or (user.role and user.role.name != "student"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    patch = payload.model_dump(exclude_unset=True)
    await Orm.upsert_student_profile(user_id, **patch)
    try:
        student_after = await Orm.get_student_by_user(user_id)
        if student_after and getattr(student_after, "is_published", False):
            await index_applicant(user_id)
        else:
            await delete_applicant(user_id)
    except Exception as e:
        logger.warning("ES sync failed for student %s: %s", user_id, e)
    user = await Orm.get_user(user_id)
    student = await Orm.get_student_by_user(user_id)
    return _student_to_read(user, student)


@router.delete("/students/{user_id}")
async def delete_student_admin(
    user_id: int,
    current_user=Depends(get_current_user),
):
    """Delete student profile (admin only). User remains, student profile is removed."""
    require_admin(current_user)
    user = await Orm.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    student = await Orm.get_student_by_user(user_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    await Orm.delete_student_profile(user_id)
    try:
        await delete_applicant(user_id)
    except Exception as e:
        logger.warning("ES delete failed for student %s: %s", user_id, e)
    return {"ok": True}
