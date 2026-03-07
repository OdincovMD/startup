"""
API для страницы «Соискатели».
GET /applicants/ — список опубликованных соискателей.
GET /applicants/public/{public_id}/details — детальная карточка по public_id.
Доступ: только lab_admin и lab_representative.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.queries.orm import Orm
from app.roles.representative.api._helpers import require_lab_admin_or_representative
from app.roles.representative.schemas import ApplicantDetail, ApplicantListItem, ApplicantListResponse

router = APIRouter(prefix="/applicants", tags=["applicants"])


@router.get("/", response_model=ApplicantListResponse)
async def list_applicants(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None, description="student | researcher"),
    current_user=Depends(get_current_user),
):
    """Список опубликованных соискателей. Только lab_admin и lab_representative."""
    require_lab_admin_or_representative(current_user)
    role_filter = role if role in ("student", "researcher") else None
    rows, total = await Orm.list_published_applicants(
        page=page,
        page_size=size,
        role_filter=role_filter,
    )
    items = [ApplicantListItem(**r) for r in rows]
    return ApplicantListResponse(items=items, total=total, page=page, size=size)


@router.get("/public/{public_id}/details", response_model=ApplicantDetail)
async def get_applicant_details(
    public_id: str,
    current_user=Depends(get_current_user),
):
    """Детальная карточка соискателя по public_id. Только lab_admin и lab_representative."""
    require_lab_admin_or_representative(current_user)
    detail_dict = await Orm.get_applicant_detail_by_public_id(public_id)
    if not detail_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Соискатель не найден")
    return ApplicantDetail(**detail_dict)
