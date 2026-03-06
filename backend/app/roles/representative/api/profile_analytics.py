"""
Эндпоинты аналитики в профиле представителя: статистика по вакансиям (просмотры, отклики).
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.queries.orm import AsyncOrm

router = APIRouter(prefix="/analytics", tags=["profile-analytics"])


@router.get("/vacancy-stats")
async def get_vacancy_stats(current_user=Depends(get_current_user)):
    """
    Для текущего пользователя (представитель организации/лаборатории) возвращает по каждой его вакансии:
    vacancy_id, public_id, name, view_count (просмотры страницы из аналитики), response_count (число откликов).
    """
    items = await AsyncOrm.get_vacancy_stats_for_user(current_user.id)
    return {"items": items}


@router.get("/dashboard")
async def get_employer_dashboard(current_user=Depends(get_current_user)):
    """
    Дашборд работодателя: сводка (KPI) и по каждой вакансии расширенные метрики
    (уникальные зрители, конверсия, среднее время на странице, дни до первого отклика/принятия, доля принятых).
    """
    data = await AsyncOrm.get_employer_dashboard_data(current_user.id)
    return data
