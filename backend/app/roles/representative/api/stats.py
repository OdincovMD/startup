"""
Публичный эндпоинт статистики для главной страницы.
"""

from fastapi import APIRouter

from app.roles.representative.queries.orm import Orm

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
async def get_stats():
    """Счётчики платформы: лаборатории, вакансии, организации, страны."""
    return await Orm.count_platform_stats()
