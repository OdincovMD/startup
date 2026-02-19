"""
Роуты FastAPI для профиля пользователя.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.schemas import UserRead, UserRoleUpdate, UserProfileUpdate, user_to_read
from app.queries.async_orm import AsyncOrm

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
        user = await AsyncOrm.update_user_role(current_user.id, payload.role_id)
        return user_to_read(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/me", response_model=UserRead)
async def update_profile(
    payload: UserProfileUpdate,
    current_user=Depends(get_current_user),
):
    full_name = payload.full_name.strip() if payload.full_name is not None else None
    user = await AsyncOrm.update_user_profile(
        current_user.id,
        full_name=full_name,
        contacts=payload.contacts,
    )
    return user_to_read(user)
