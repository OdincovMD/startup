"""
Эндпоинты аналитики в профиле представителя: статистика по вакансиям (просмотры, отклики).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.queries.orm import Orm

router = APIRouter(prefix="/analytics", tags=["profile-analytics"])


@router.get("/extended")
async def get_extended_analytics(current_user=Depends(get_current_user)):
    """
    Расширенная аналитика для Pro: просмотры 7/30 дн., конверсия, сравнение с платформой.
    Доступно только пользователям с подпиской Pro.
    """
    from app.core.queries.orm import Orm as CoreOrm
    sub = await CoreOrm.get_active_subscription(current_user.id)
    tier = (getattr(sub, "tier", None) or "pro") if sub else None
    if not sub or tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Расширенная аналитика доступна только подписчикам тарифа Pro",
        )
    data = await Orm.get_extended_analytics_for_user(current_user.id)
    return data


@router.get("/vacancy-stats")
async def get_vacancy_stats(current_user=Depends(get_current_user)):
    """
    Для текущего пользователя (представитель организации/лаборатории) возвращает по каждой его вакансии:
    vacancy_id, public_id, name, view_count (просмотры страницы из аналитики), response_count (число откликов).
    """
    items = await Orm.get_vacancy_stats_for_user(current_user.id)
    return {"items": items}


@router.get("/dashboard")
async def get_employer_dashboard(current_user=Depends(get_current_user)):
    """
    Дашборд работодателя: сводка (KPI) и по каждой вакансии расширенные метрики
    (уникальные зрители, конверсия, среднее время на странице, дни до первого отклика/принятия, доля принятых).
    """
    data = await Orm.get_employer_dashboard_data(current_user.id)
    return data
