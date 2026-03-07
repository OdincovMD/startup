"""
Роуты FastAPI для профиля пользователя.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.core.schemas import UserRead, UserRoleUpdate, UserProfileUpdate, UserAvatarUpdate, user_to_read
from app.queries.orm import Orm

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user=Depends(get_current_user)):
    return user_to_read(current_user)


@router.put("/me/role", response_model=UserRead)
async def update_role(
    payload: UserRoleUpdate,
    current_user=Depends(get_current_user),
):
    try:
        user = await Orm.update_user_role(current_user.id, payload.role_id)
        logger.info("User role updated: user_id=%s role_id=%s", user.id, payload.role_id)
        return user_to_read(user)
    except ValueError as e:
        logger.warning("Update role failed for user_id=%s: %s", current_user.id, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/me", response_model=UserRead)
async def update_profile(
    payload: UserProfileUpdate,
    current_user=Depends(get_current_user),
):
    full_name = payload.full_name.strip() if payload.full_name is not None else None
    user = await Orm.update_user_profile(
        current_user.id,
        full_name=full_name,
        contacts=payload.contacts,
    )
    logger.info("User profile updated: user_id=%s", user.id)
    return user_to_read(user)


@router.put("/me/avatar", response_model=UserRead)
async def update_avatar(
    payload: UserAvatarUpdate,
    current_user=Depends(get_current_user),
):
    user = await Orm.update_user_avatar(
        current_user.id,
        photo_url=payload.photo_url,
    )
    logger.info("User avatar updated: user_id=%s", user.id)
    return user_to_read(user)
