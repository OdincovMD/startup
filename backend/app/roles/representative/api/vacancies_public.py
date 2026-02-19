"""
Публичные роуты FastAPI для работы с вакансиями.
GET / — список опубликованных вакансий,
GET /public/{public_id}/details — детали вакансии по public_id.
"""

from fastapi import APIRouter, HTTPException, status

from app.roles.representative.schemas import VacancyOrganizationRead
from app.queries.async_orm import AsyncOrm

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


@router.get("/", response_model=list[VacancyOrganizationRead])
async def list_vacancies():
    """Список опубликованных вакансий для публичного каталога."""
    try:
        return await AsyncOrm.list_published_vacancies()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VACANCY_LIST_FAILURE", "message": str(e)},
        )


@router.get("/public/{public_id}/details", response_model=VacancyOrganizationRead)
async def get_vacancy_details(public_id: str):
    """Публичная карточка вакансии по public_id (только опубликованные)."""
    vacancy = await AsyncOrm.get_vacancy_by_public_id(public_id)
    if not vacancy or not getattr(vacancy, "is_published", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacancy not found",
        )
    return vacancy
