"""
API откликов на вакансии: список для работодателя, смена статуса, «мои отклики» для соискателя.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.roles.representative.schemas import VacancyResponseRead, VacancyResponseStatusUpdate
from app.queries.orm import AsyncOrm

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
        logger.warning("Update vacancy response status failed: response_id=%s user_id=%s not found", response_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отклик не найден")
    # Уведомление соискателю о смене статуса
    applicant_user_id = updated.get("user_id")
    if applicant_user_id:
        await AsyncOrm.create_notification(
            applicant_user_id,
            "vacancy_response_status_changed",
            {
                "response_id": response_id,
                "vacancy_name": updated.get("vacancy_name"),
                "vacancy_public_id": updated.get("vacancy_public_id"),
                "status": updated["status"],
            },
        )
    logger.info("Vacancy response status updated: response_id=%s status=%s vacancy_id=%s", response_id, payload.status, updated.get("vacancy_id"))
    return updated


@router.get("/my-vacancy-responses", response_model=list[VacancyResponseRead])
async def list_my_vacancy_responses(current_user=Depends(get_current_user)):
    """Список своих откликов (соискатель)."""
    items = await AsyncOrm.list_my_vacancy_responses(current_user.id)
    return items
