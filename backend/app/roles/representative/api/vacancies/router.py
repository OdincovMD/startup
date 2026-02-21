"""Vacancies view — CRUD для вакансий."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.roles.representative.schemas import (
    VacancyOrganizationCreate,
    VacancyOrganizationRead,
    VacancyOrganizationUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.async_orm import AsyncOrm

router = APIRouter()


class PublishToggle(BaseModel):
    is_published: bool


@router.get("/organization/vacancies", response_model=list[VacancyOrganizationRead])
async def list_org_vacancies(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.list_vacancies_for_org(org.id)
    if is_lab_representative(current_user):
        return await AsyncOrm.list_vacancies_for_creator(current_user.id)
    return []


@router.post("/organization/vacancies", response_model=VacancyOrganizationRead)
async def create_org_vacancy(
    payload: VacancyOrganizationCreate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.create_vacancy(
            org.id,
            creator_user_id=current_user.id,
            name=payload.name,
            requirements=payload.requirements,
            description=payload.description,
            employment_type=payload.employment_type,
            query_id=payload.query_id,
            laboratory_id=payload.laboratory_id,
            contact_employee_id=payload.contact_employee_id,
            contact_email=payload.contact_email,
            contact_phone=payload.contact_phone,
        )
    if is_lab_representative(current_user):
        require_lab_link_for_lab_rep(
            laboratory_ids=None,
            laboratory_id=payload.laboratory_id,
            query_id=payload.query_id,
        )
        return await AsyncOrm.create_vacancy(
            None,
            creator_user_id=current_user.id,
            name=payload.name,
            requirements=payload.requirements,
            description=payload.description,
            employment_type=payload.employment_type,
            query_id=payload.query_id,
            laboratory_id=payload.laboratory_id,
            contact_employee_id=payload.contact_employee_id,
            contact_email=payload.contact_email,
            contact_phone=payload.contact_phone,
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Organization profile not found. Сначала заполните и сохраните профиль организации.",
    )


@router.put("/organization/vacancies/{vacancy_id}", response_model=VacancyOrganizationRead)
async def update_org_vacancy(
    vacancy_id: int,
    payload: VacancyOrganizationUpdate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_id = patch.get("laboratory_id")
    query_id = patch.get("query_id")
    if is_lab_representative(current_user):
        if ("laboratory_id" in patch and "query_id" in patch
                and laboratory_id is None and query_id is None):
            require_lab_link_for_lab_rep(laboratory_ids=None, laboratory_id=None, query_id=None)
    if org:
        vacancy = await AsyncOrm.update_vacancy(
            vacancy_id,
            org.id,
            name=patch.get("name"),
            requirements=patch.get("requirements"),
            description=patch.get("description"),
            employment_type=patch.get("employment_type"),
            query_id=query_id,
            laboratory_id=laboratory_id,
            contact_employee_id=patch.get("contact_employee_id"),
            contact_email=patch.get("contact_email"),
            contact_phone=patch.get("contact_phone"),
            patch=patch,
        )
    elif is_lab_representative(current_user):
        vacancy = await AsyncOrm.update_vacancy_for_creator(
            vacancy_id,
            current_user.id,
            name=patch.get("name"),
            requirements=patch.get("requirements"),
            description=patch.get("description"),
            employment_type=patch.get("employment_type"),
            query_id=query_id,
            laboratory_id=laboratory_id,
            contact_employee_id=patch.get("contact_employee_id"),
            contact_email=patch.get("contact_email"),
            contact_phone=patch.get("contact_phone"),
            patch=patch,
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not vacancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    return vacancy


@router.delete("/organization/vacancies/{vacancy_id}")
async def delete_org_vacancy(vacancy_id: int, current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        deleted = await AsyncOrm.delete_vacancy(vacancy_id, org.id)
    elif is_lab_representative(current_user):
        deleted = await AsyncOrm.delete_vacancy_for_creator(vacancy_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    return {"status": "ok"}


@router.put("/organization/vacancies/{vacancy_id}/publish", response_model=VacancyOrganizationRead)
async def set_vacancy_publish_state(
    vacancy_id: int,
    payload: PublishToggle,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        vacancy = await AsyncOrm.set_vacancy_published(vacancy_id, org.id, payload.is_published)
    elif is_lab_representative(current_user):
        vacancy = await AsyncOrm.set_vacancy_published_for_creator(
            vacancy_id, current_user.id, payload.is_published
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not vacancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    return vacancy
