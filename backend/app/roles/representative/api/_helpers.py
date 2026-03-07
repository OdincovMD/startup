"""Helpers for representative API."""

from fastapi import HTTPException, status


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
