"""
Публичный API для главной страницы: featured organizations, laboratories, vacancies.
"""

import random
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.queries.orm import Orm
from app.services.elasticsearch import (
    get_organizations_ranking_for_featured,
    get_laboratories_ranking_for_featured,
    get_vacancies_ranking_for_featured,
    search_vacancies,
)

router = APIRouter(prefix="/home", tags=["home"])


def _apply_random_and_pick(
    ranking: list[dict],
    limit: int,
    pool_size: int = 15,
    noise_range: float = 2.0,
) -> list[int]:
    """
    Группировка по paid_active, добавление шума к score для первых pool_size в группе,
    сортировка по adjusted_score, возврат первых limit id.
    """
    paid = [r for r in ranking if r.get("paid_active")]
    free = [r for r in ranking if not r.get("paid_active")]

    def add_noise_and_sort(group: list[dict], take: int) -> list[dict]:
        subset = group[:take]
        for r in subset:
            r["adjusted_score"] = (r.get("rank_score") or 0) + random.uniform(
                -noise_range, noise_range
            )
        subset.sort(key=lambda x: x["adjusted_score"], reverse=True)
        return subset

    paid_sorted = add_noise_and_sort(paid, pool_size)
    free_sorted = add_noise_and_sort(free, pool_size)
    combined = paid_sorted + free_sorted
    return [r["id"] for r in combined[:limit]]


@router.get("/featured")
async def get_featured():
    """
    Рекомендованные сущности для главной: организации, лаборатории, вакансии.
    Сортировка: платные первыми, затем по rank_score с небольшим рандомом для первой тройки.
    """
    try:
        org_ranking = await get_organizations_ranking_for_featured(size=30)
        lab_ranking = await get_laboratories_ranking_for_featured(size=30)
        vac_ranking = await get_vacancies_ranking_for_featured(size=30)

        org_ids = _apply_random_and_pick(org_ranking, limit=18)
        lab_ids = _apply_random_and_pick(lab_ranking, limit=18)
        vac_ids = _apply_random_and_pick(vac_ranking, limit=15)

        orgs = (
            await Orm.get_organizations_by_ids(org_ids)
            if org_ids
            else []
        )
        labs = (
            await Orm.get_laboratories_by_ids(lab_ids)
            if lab_ids
            else []
        )

        vac_items: list[dict[str, Any]] = []
        if vac_ids:
            vac_result = await search_vacancies(q="", page=1, size=50)
            items = vac_result.get("items", [])
            id_to_item = {it.get("id"): it for it in items if it.get("id") is not None}
            vac_items = [id_to_item[vid] for vid in vac_ids if vid in id_to_item]

        def _org_to_dict(o) -> dict:
            return {
                "id": o.id,
                "public_id": getattr(o, "public_id", None),
                "name": getattr(o, "name", ""),
                "description": getattr(o, "description"),
                "avatar_url": getattr(o, "avatar_url"),
                "address": getattr(o, "address"),
                "website": getattr(o, "website"),
            }

        def _lab_to_dict(l) -> dict:
            org = getattr(l, "organization", None)
            return {
                "id": l.id,
                "public_id": getattr(l, "public_id", None),
                "name": getattr(l, "name", ""),
                "description": getattr(l, "description"),
                "activities": getattr(l, "activities"),
                "image_urls": getattr(l, "image_urls") or [],
                "organization": (
                    {
                        "id": org.id,
                        "public_id": getattr(org, "public_id"),
                        "name": getattr(org, "name", ""),
                    }
                    if org
                    else None
                ),
                "head_employee": (
                    {"full_name": getattr(l.head_employee, "full_name", None)}
                    if getattr(l, "head_employee", None)
                    else None
                ),
            }

        return {
            "organizations": [_org_to_dict(o) for o in orgs],
            "laboratories": [_lab_to_dict(l) for l in labs],
            "vacancies": vac_items,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FEATURED_LOAD_FAILURE", "message": str(e)},
        ) from e
