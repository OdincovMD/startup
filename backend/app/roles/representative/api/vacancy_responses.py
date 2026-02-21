"""
API откликов на вакансии: список для работодателя, смена статуса, «мои отклики» для соискателя.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.roles.representative.schemas import VacancyResponseRead, VacancyResponseStatusUpdate
from app.queries.async_orm import AsyncOrm

router = APIRouter(tags=["profile-vacancy-responses"])


@router.get("/vacancy-responses", response_model=list[VacancyResponseRead])
async def list_vacancy_responses_for_employer(current_user=Depends(get_current_user)):
    """Список откликов на вакансии текущего пользователя (работодатель)."""
    items = await AsyncOrm.list_vacancy_responses_for_employer(current_user.id)
    return items


@router.patch("/vacancy-responses/{response_id:int}", response_model=VacancyResponseRead)
async def update_vacancy_response_status(
    response_id: int,
    payload: VacancyResponseStatusUpdate,
    current_user=Depends(get_current_user),
):
    """Изменить статус отклика (только для создателя вакансии)."""
    updated = await AsyncOrm.update_vacancy_response_status(
        response_id, current_user.id, payload.status
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отклик не найден")
    return updated


@router.get("/my-vacancy-responses", response_model=list[VacancyResponseRead])
async def list_my_vacancy_responses(current_user=Depends(get_current_user)):
    """Список своих откликов (соискатель)."""
    items = await AsyncOrm.list_my_vacancy_responses(current_user.id)
    return items
