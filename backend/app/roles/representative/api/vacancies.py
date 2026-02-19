"""
Роуты FastAPI для работы с вакансиями организаций.
POST / — создание вакансии,
GET / — список вакансий,
GET /{vacancy_id} — получение вакансии по ID.
"""

from fastapi import APIRouter, HTTPException, status, Depends

from app.roles.representative.schemas import VacancyOrganizationCreate, VacancyOrganizationRead
from app.queries.async_orm import AsyncOrm
from app.api.deps import get_current_user

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


@router.post("/", response_model=VacancyOrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_vacancy(vacancy_in: VacancyOrganizationCreate, _user=Depends(get_current_user)):
    """Создание новой вакансии."""
    org = await AsyncOrm.get_organization(vacancy_in.organization_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization does not exist",
        )
    try:
        return await AsyncOrm.create_vacancy(
            organization_id=vacancy_in.organization_id,
            creator_user_id=_user.id,
            name=vacancy_in.name,
            requirements=vacancy_in.requirements,
            description=vacancy_in.description,
            employment_type=vacancy_in.employment_type,
            query_id=vacancy_in.query_id,
            laboratory_id=vacancy_in.laboratory_id,
            contact_employee_id=vacancy_in.contact_employee_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VACANCY_CREATION_FAILURE", "message": str(e)},
        )


@router.get("/", response_model=list[VacancyOrganizationRead])
async def list_vacancies():
    """Список опубликованных вакансий."""
    try:
        return await AsyncOrm.list_published_vacancies()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VACANCY_LIST_FAILURE", "message": str(e)},
        )


@router.get("/{vacancy_id}", response_model=VacancyOrganizationRead)
async def get_vacancy(vacancy_id: int):
    """Получение вакансии по ID."""
    vacancy = await AsyncOrm.get_vacancy(vacancy_id)
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacancy not found",
        )
    return vacancy


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
