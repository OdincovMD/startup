"""
Глобальный поиск: подсказки по вакансиям, организациям, лабораториям, запросам.
"""

from fastapi import APIRouter, Query

from app.services.elasticsearch import suggest_global

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/suggest")
async def global_suggest(
    q: str = Query("", min_length=0),
    limit: int = Query(12, ge=1, le=20),
):
    """
    Глобальные подсказки для автодополнения.
    Возвращает items с type, public_id, title для навигации на карточки.
    """
    items = await suggest_global(q=q.strip(), limit=limit)
    return {"items": items}
