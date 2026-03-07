"""
API уведомлений: список и отметка прочитанным.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["profile-notifications"])


@router.get("")
async def get_my_notifications(current_user=Depends(get_current_user)):
    """Список уведомлений текущего пользователя."""
    from app.queries.orm import Orm

    notifications = await Orm.get_notifications_for_user(current_user.id)
    return [
        {
            "id": n.id,
            "type": n.type,
            "data": n.data,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "read_at": n.read_at.isoformat() if n.read_at else None,
        }
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(current_user=Depends(get_current_user)):
    """Количество непрочитанных уведомлений (для бейджа)."""
    from app.queries.orm import Orm

    count = await Orm.get_unread_notification_count(current_user.id)
    return {"count": count}


@router.patch("/{notification_id:int}/read")
async def mark_notification_read(
    notification_id: int,
    current_user=Depends(get_current_user),
):
    """Отметить уведомление прочитанным и удалить (очистка просмотренных)."""
    from app.queries.orm import Orm

    n = await Orm.mark_notification_read(notification_id, current_user.id)
    if not n:
        logger.warning("Mark notification read failed: notification_id=%s user_id=%s not found", notification_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")
    await Orm.delete_notification(notification_id, current_user.id)
    logger.info("Notification marked read and deleted: notification_id=%s user_id=%s", notification_id, current_user.id)
    return {"ok": True}


@router.delete("/{notification_id:int}")
async def delete_notification(
    notification_id: int,
    current_user=Depends(get_current_user),
):
    """Удалить уведомление."""
    from app.queries.orm import Orm

    ok = await Orm.delete_notification(notification_id, current_user.id)
    if not ok:
        logger.warning("Delete notification failed: notification_id=%s user_id=%s not found", notification_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")
    logger.info("Notification deleted: notification_id=%s user_id=%s", notification_id, current_user.id)
    return {"ok": True}
