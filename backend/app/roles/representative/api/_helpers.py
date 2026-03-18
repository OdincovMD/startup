"""Helpers for representative API."""

from fastapi import HTTPException, status


def is_platform_admin(user) -> bool:
    return user.role is not None and user.role.name == "platform_admin"


async def require_subscription_for_applicants(user) -> None:
    """403 если у пользователя нет активной подписки. Для доступа к разделу соискателей. platform_admin — без проверки."""
    from app.core.queries.orm import Orm as CoreOrm

    if not user or not user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ запрещён")
    if is_platform_admin(user):
        return
    has_sub = await CoreOrm.has_active_subscription(user.id)
    if not has_sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "SUBSCRIPTION_REQUIRED",
                "message": "Доступ к разделу соискателей требует активной подписки",
            },
        )


def is_lab_representative(user) -> bool:
    return user.role is not None and user.role.name == "lab_representative"


def is_lab_admin(user) -> bool:
    return user.role is not None and user.role.name == "lab_admin"


def require_lab_admin_or_representative(user) -> None:
    """403 если роль не lab_admin и не lab_representative."""
    if not user or not user.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ запрещён")
    if user.role.name not in ("lab_admin", "lab_representative"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для представителей организации и лаборатории",
        )


def require_applicants_access(user) -> None:
    """403 если роль не lab_admin, lab_representative или platform_admin. Для страницы соискателей."""
    if not user or not user.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ запрещён")
    if user.role.name not in ("lab_admin", "lab_representative", "platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступно только для представителей организации, лаборатории и администраторов",
        )


_MSG_LAB_LINK_REQUIRED = (
    "Сущность должна быть привязана к лаборатории или организации. "
    "Укажите хотя бы одну лабораторию."
)


def require_lab_link_for_lab_rep(
    laboratory_ids: list | None = None,
    laboratory_id: int | None = None,
    query_id: int | None = None,
) -> None:
    if laboratory_ids is not None:
        if not laboratory_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=_MSG_LAB_LINK_REQUIRED,
            )
        return
    if laboratory_id is not None or query_id is not None:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=_MSG_LAB_LINK_REQUIRED,
    )
