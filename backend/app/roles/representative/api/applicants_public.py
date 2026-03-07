"""
API для страницы «Соискатели».
GET /applicants/ — список опубликованных соискателей (поиск q, фильтры, пагинация).
GET /applicants/suggest — подсказки для автодополнения.
GET /applicants/public/{public_id}/details — детальная карточка по public_id.
Доступ: только lab_admin и lab_representative.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.queries.orm import Orm
from app.roles.representative.api._helpers import require_lab_admin_or_representative
from app.roles.representative.schemas import ApplicantDetail, ApplicantListItem, ApplicantListResponse
from app.services.elasticsearch import search_applicants, suggest_applicants

router = APIRouter(prefix="/applicants", tags=["applicants"])


@router.get("/suggest")
async def suggest_applicants_endpoint(
    q: str = Query("", min_length=0),
    limit: int = Query(8, ge=1, le=20),
    current_user=Depends(get_current_user),
):
    """Подсказки для автодополнения поиска соискателей."""
    require_lab_admin_or_representative(current_user)
    suggestions = await suggest_applicants(q=q.strip(), limit=limit)
    return {"suggestions": suggestions}


@router.get("/", response_model=ApplicantListResponse)
async def list_applicants(
    q: str = Query("", min_length=0),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None, description="student | researcher"),
    status: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="date_desc | date_asc"),
    current_user=Depends(get_current_user),
):
    """
    Список опубликованных соискателей.
    При q или фильтрах — поиск через Elasticsearch.
    Иначе — все из PostgreSQL.
    """
    require_lab_admin_or_representative(current_user)
    q_stripped = (q or "").strip()
    role_filter = role if role in ("student", "researcher") else None
    use_es = bool(q_stripped) or role_filter or (status and status.strip())

    if use_es:
        try:
            result = await search_applicants(
                q=q_stripped,
                page=page,
                size=size,
                role=role_filter,
                status=status,
                sort_by=sort_by,
            )
            items = [ApplicantListItem(**r) for r in result["items"]]
            return ApplicantListResponse(
                items=items,
                total=result["total"],
                page=result["page"],
                size=result["size"],
            )
        except Exception:
            return ApplicantListResponse(items=[], total=0, page=page, size=size)

    try:
        rows, total = await Orm.list_published_applicants(
            page=page,
            page_size=size,
            role_filter=role_filter,
        )
        items = [ApplicantListItem(**r) for r in rows]
        return ApplicantListResponse(items=items, total=total, page=page, size=size)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "APPLICANT_LIST_FAILURE", "message": str(e)},
        )


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
