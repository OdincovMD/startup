"""Vacancies view — CRUD для вакансий."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.roles.representative.schemas import (
    VacancyOrganizationCreate,
    VacancyOrganizationRead,
    VacancyOrganizationUpdate,
)
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.orm import Orm
from app.services.elasticsearch import index_vacancy, delete_vacancy

logger = logging.getLogger(__name__)

router = APIRouter()


class PublishToggle(BaseModel):
    is_published: bool


@router.get("/organization/vacancies", response_model=list[VacancyOrganizationRead])
async def list_org_vacancies(current_user=Depends(get_current_user)):
    org = await Orm.get_organization_for_user(current_user.id)
    if org:
        return await Orm.list_vacancies_for_org(org.id)
    if is_lab_representative(current_user):
        return await Orm.list_vacancies_for_creator(current_user.id)
    return []


@router.post("/organization/vacancies", response_model=VacancyOrganizationRead)
async def create_org_vacancy(
    payload: VacancyOrganizationCreate,
    current_user=Depends(get_current_user),
):
    org = await Orm.get_organization_for_user(current_user.id)
    if org:
        return await Orm.create_vacancy(
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
        return await Orm.create_vacancy(
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
        detail="Сначала заполните и сохраните профиль организации.",
    )


def _vacancy_has_contact(contact_employee_id, contact_email, contact_phone) -> bool:
    if contact_employee_id:
        return True
    email = (contact_email or "").strip()
    phone = (contact_phone or "").strip()
    return bool(email and phone)


@router.put("/organization/vacancies/{vacancy_id}", response_model=VacancyOrganizationRead)
async def update_org_vacancy(
    vacancy_id: int,
    payload: VacancyOrganizationUpdate,
    current_user=Depends(get_current_user),
):
    org = await Orm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_id = patch.get("laboratory_id")
    query_id = patch.get("query_id")
    if is_lab_representative(current_user):
        if ("laboratory_id" in patch and "query_id" in patch
                and laboratory_id is None and query_id is None):
            require_lab_link_for_lab_rep(laboratory_ids=None, laboratory_id=None, query_id=None)
    # Проверка: нельзя удалять контакт или лабораторию у опубликованной вакансии
    vacancy = None
    if org:
        vacancy = await Orm.get_vacancy_for_org(vacancy_id, org.id)
    elif is_lab_representative(current_user):
        vacancy = await Orm.get_vacancy_for_creator(vacancy_id, current_user.id)
    if vacancy and getattr(vacancy, "is_published", False):
        eff_contact_id = patch.get("contact_employee_id", vacancy.contact_employee_id)
        eff_email = patch.get("contact_email", vacancy.contact_email)
        eff_phone = patch.get("contact_phone", vacancy.contact_phone)
        if "contact_employee_id" in patch and patch["contact_employee_id"] is None:
            if not _vacancy_has_contact(None, eff_email, eff_phone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Снимите вакансию с публикации, затем удалите контактное лицо.",
                )
        if "laboratory_id" in patch and patch["laboratory_id"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Снимите вакансию с публикации, затем удалите лабораторию.",
            )
    if org:
        vacancy = await Orm.update_vacancy(
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
        vacancy = await Orm.update_vacancy_for_creator(
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
    try:
        if getattr(vacancy, "is_published", False):
            await index_vacancy(vacancy)
        else:
            await delete_vacancy(vacancy.id)
    except Exception as e:
        logger.warning("Elasticsearch sync failed for vacancy %s: %s", vacancy.id, e)
    return vacancy


@router.delete("/organization/vacancies/{vacancy_id}")
async def delete_org_vacancy(vacancy_id: int, current_user=Depends(get_current_user)):
    org = await Orm.get_organization_for_user(current_user.id)
    if org:
        deleted = await Orm.delete_vacancy(vacancy_id, org.id)
    elif is_lab_representative(current_user):
        deleted = await Orm.delete_vacancy_for_creator(vacancy_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    try:
        await delete_vacancy(vacancy_id)
    except Exception as e:
        logger.warning("Elasticsearch delete failed for vacancy %s: %s", vacancy_id, e)
    return {"status": "ok"}


@router.put("/organization/vacancies/{vacancy_id}/publish", response_model=VacancyOrganizationRead)
async def set_vacancy_publish_state(
    vacancy_id: int,
    payload: PublishToggle,
    current_user=Depends(get_current_user),
):
    org = await Orm.get_organization_for_user(current_user.id)
    vacancy_before = None
    if org:
        vacancy_before = await Orm.get_vacancy_for_org(vacancy_id, org.id)
    elif is_lab_representative(current_user):
        vacancy_before = await Orm.get_vacancy_for_creator(vacancy_id, current_user.id)
    if not vacancy_before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    if payload.is_published:
        if not _vacancy_has_contact(
            vacancy_before.contact_employee_id,
            vacancy_before.contact_email,
            vacancy_before.contact_phone,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя опубликовать вакансию без контактного лица. Укажите сотрудника или email и телефон.",
            )
        if not vacancy_before.laboratory_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя опубликовать вакансию без лаборатории. Привяжите лабораторию.",
            )
    if org:
        vacancy = await Orm.set_vacancy_published(vacancy_id, org.id, payload.is_published)
    else:
        vacancy = await Orm.set_vacancy_published_for_creator(
            vacancy_id, current_user.id, payload.is_published
        )
    try:
        if payload.is_published:
            await index_vacancy(vacancy)
        else:
            await delete_vacancy(vacancy_id)
    except Exception as e:
        logger.warning("Elasticsearch sync failed for vacancy %s: %s", vacancy_id, e)
    return vacancy
