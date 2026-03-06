"""Employees view — CRUD для сотрудников."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.services.elasticsearch import reindex_laboratories_by_ids, reindex_organizations_by_ids

logger = logging.getLogger(__name__)
from app.roles.representative.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.roles.representative.api._helpers import is_lab_representative, require_lab_link_for_lab_rep
from app.queries.orm import AsyncOrm
from app.services.openalex import (
    fetch_author_by_id,
    fetch_author_by_orcid,
    fetch_author_works,
    map_author_to_researcher,
)

router = APIRouter()


def _extract_openalex_id(val: str) -> str:
    val = (val or "").strip()
    if "openalex.org/" in val:
        return val.split("/")[-1]
    return val


def _extract_orcid(val: str) -> str:
    val = (val or "").strip()
    if "orcid.org/" in val:
        return val.split("/")[-1]
    return val


class EmployeeImportOpenAlexBody(BaseModel):
    orcid: str | None = None
    openalex_id: str | None = None


@router.get("/organization/employees", response_model=list[EmployeeRead])
async def list_org_employees(current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        return await AsyncOrm.list_employees_for_org(org.id)
    if is_lab_representative(current_user):
        return await AsyncOrm.list_employees_for_creator(current_user.id)
    return []


@router.post("/organization/employees", response_model=EmployeeRead)
async def create_org_employee(
    payload: EmployeeCreate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        emp = await AsyncOrm.create_employee_for_org(
            org.id,
            creator_user_id=current_user.id,
            full_name=payload.full_name,
            positions=payload.positions,
            academic_degree=payload.academic_degree,
            photo_url=payload.photo_url,
            research_interests=payload.research_interests,
            education=payload.education,
            publications=[item.model_dump() for item in (payload.publications or [])],
            hindex_wos=payload.hindex_wos,
            hindex_scopus=payload.hindex_scopus,
            hindex_rsci=payload.hindex_rsci,
            hindex_openalex=payload.hindex_openalex,
            contacts=payload.contacts,
            laboratory_ids=payload.laboratory_ids,
        )
        logger.info("Employee created: id=%s org_id=%s", emp.id, org.id)
        lab_ids = [l.id for l in (emp.laboratories or [])] if emp else (payload.laboratory_ids or [])
        if lab_ids:
            await reindex_laboratories_by_ids(lab_ids)
        try:
            await reindex_organizations_by_ids([org.id])
        except Exception as e:
            logger.warning("Organization reindex failed after employee create: org_id=%s %s", org.id, e)
        return emp
    if is_lab_representative(current_user):
        require_lab_link_for_lab_rep(payload.laboratory_ids)
        emp = await AsyncOrm.create_employee_for_org(
            None,
            creator_user_id=current_user.id,
            full_name=payload.full_name,
            positions=payload.positions,
            academic_degree=payload.academic_degree,
            photo_url=payload.photo_url,
            research_interests=payload.research_interests,
            education=payload.education,
            publications=[item.model_dump() for item in (payload.publications or [])],
            hindex_wos=payload.hindex_wos,
            hindex_scopus=payload.hindex_scopus,
            hindex_rsci=payload.hindex_rsci,
            hindex_openalex=payload.hindex_openalex,
            contacts=payload.contacts,
            laboratory_ids=payload.laboratory_ids,
        )
        logger.info("Employee created: id=%s org_id=None creator_user_id=%s", emp.id, current_user.id)
        lab_ids = [l.id for l in (emp.laboratories or [])] if emp else (payload.laboratory_ids or [])
        if lab_ids:
            await reindex_laboratories_by_ids(lab_ids)
        org_ids = list({l.organization_id for l in (emp.laboratories or []) if getattr(l, "organization_id", None)})
        if org_ids:
            try:
                await reindex_organizations_by_ids(org_ids)
            except Exception as e:
                logger.warning("Organization reindex failed after employee create: %s", e)
        return emp
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Сначала заполните и сохраните профиль организации.",
    )


@router.get("/organization/employees/{employee_id}", response_model=EmployeeRead)
async def get_org_employee(employee_id: int, current_user=Depends(get_current_user)):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        employee = await AsyncOrm.get_employee(employee_id, org.id)
    elif is_lab_representative(current_user):
        employee = await AsyncOrm.get_employee_for_creator(employee_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@router.put("/organization/employees/{employee_id}", response_model=EmployeeRead)
async def update_org_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    current_user=Depends(get_current_user),
):
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    patch = payload.model_dump(exclude_unset=True)
    laboratory_ids = patch.get("laboratory_ids")
    if is_lab_representative(current_user) and "laboratory_ids" in patch:
        require_lab_link_for_lab_rep(laboratory_ids=laboratory_ids)
    # Получить старые lab_ids до обновления (для переиндексации при снятии сотрудника с лабораторий)
    employee_before = None
    if org:
        employee_before = await AsyncOrm.get_employee(employee_id, org.id)
    elif is_lab_representative(current_user):
        employee_before = await AsyncOrm.get_employee_for_creator(employee_id, current_user.id)
    old_lab_ids = [l.id for l in (employee_before.laboratories or [])] if employee_before else []
    if org:
        employee = await AsyncOrm.update_employee(
            employee_id,
            org.id,
            full_name=patch.get("full_name"),
            positions=patch.get("positions"),
            academic_degree=patch.get("academic_degree"),
            photo_url=patch.get("photo_url"),
            research_interests=patch.get("research_interests"),
            education=patch.get("education"),
            publications=patch.get("publications"),
            hindex_wos=patch.get("hindex_wos"),
            hindex_scopus=patch.get("hindex_scopus"),
            hindex_rsci=patch.get("hindex_rsci"),
            hindex_openalex=patch.get("hindex_openalex"),
            contacts=patch.get("contacts"),
            laboratory_ids=laboratory_ids,
        )
    elif is_lab_representative(current_user):
        employee = await AsyncOrm.update_employee_for_creator(
            employee_id,
            current_user.id,
            full_name=patch.get("full_name"),
            positions=patch.get("positions"),
            academic_degree=patch.get("academic_degree"),
            photo_url=patch.get("photo_url"),
            research_interests=patch.get("research_interests"),
            education=patch.get("education"),
            publications=patch.get("publications"),
            hindex_wos=patch.get("hindex_wos"),
            hindex_scopus=patch.get("hindex_scopus"),
            hindex_rsci=patch.get("hindex_rsci"),
            hindex_openalex=patch.get("hindex_openalex"),
            contacts=patch.get("contacts"),
            laboratory_ids=laboratory_ids,
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    new_lab_ids = [l.id for l in (employee.laboratories or [])]
    lab_ids_to_reindex = list(set(old_lab_ids) | set(new_lab_ids))
    if lab_ids_to_reindex:
        await reindex_laboratories_by_ids(lab_ids_to_reindex)
    org_ids = list({l.organization_id for l in (employee.laboratories or []) if getattr(l, "organization_id", None)})
    if org:
        org_ids = list(set(org_ids) | {org.id})
    if org_ids:
        try:
            await reindex_organizations_by_ids(org_ids)
        except Exception as e:
            logger.warning("Organization reindex failed after employee update: %s", e)
    logger.info("Employee updated: id=%s", employee_id)
    return employee


class EmployeeImportOpenAlexPreviewResponse(BaseModel):
    full_name: str
    research_interests: list[str] | None
    education: list[str] | None
    publications: list[dict] | None
    hindex_openalex: int | None


@router.post("/organization/employees/import-openalex-preview", response_model=EmployeeImportOpenAlexPreviewResponse)
async def import_employee_openalex_preview(
    body: EmployeeImportOpenAlexBody,
    current_user=Depends(get_current_user),
):
    """Preview импорта данных сотрудника по ORCID или OpenAlex ID (для формы «Новый сотрудник»)."""
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if not org and not is_lab_representative(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")

    author = None
    openalex_id = None
    if body.openalex_id:
        openalex_id = _extract_openalex_id(body.openalex_id)
        if openalex_id:
            author = fetch_author_by_id(openalex_id)
    if not author and body.orcid:
        orcid = _extract_orcid(body.orcid)
        if orcid:
            author = fetch_author_by_orcid(orcid)
            if author:
                openalex_id = _extract_openalex_id(author.get("id", ""))

    if not author:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите ORCID или OpenAlex ID. Автор не найден в OpenAlex.",
        )
    if not openalex_id:
        openalex_id = _extract_openalex_id(author.get("id", ""))

    works = fetch_author_works(openalex_id, per_page=25)
    mapped = map_author_to_researcher(author, works)
    return EmployeeImportOpenAlexPreviewResponse(
        full_name=mapped.get("full_name") or "",
        research_interests=mapped.get("research_interests"),
        education=mapped.get("education"),
        publications=mapped.get("publications"),
        hindex_openalex=mapped.get("hindex_openalex"),
    )


@router.post("/organization/employees/{employee_id}/import-openalex", response_model=EmployeeRead)
async def import_employee_openalex(
    employee_id: int,
    body: EmployeeImportOpenAlexBody,
    current_user=Depends(get_current_user),
):
    """Импорт данных сотрудника по ORCID или OpenAlex ID."""
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if org:
        employee = await AsyncOrm.get_employee(employee_id, org.id)
    elif is_lab_representative(current_user):
        employee = await AsyncOrm.get_employee_for_creator(employee_id, current_user.id)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    author = None
    openalex_id = None
    if body.openalex_id:
        openalex_id = _extract_openalex_id(body.openalex_id)
        if openalex_id:
            author = fetch_author_by_id(openalex_id)
    if not author and body.orcid:
        orcid = _extract_orcid(body.orcid)
        if orcid:
            author = fetch_author_by_orcid(orcid)
            if author:
                openalex_id = _extract_openalex_id(author.get("id", ""))

    if not author:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите ORCID или OpenAlex ID. Автор не найден в OpenAlex.",
        )
    if not openalex_id:
        openalex_id = _extract_openalex_id(author.get("id", ""))

    works = fetch_author_works(openalex_id, per_page=25)
    mapped = map_author_to_researcher(author, works)

    if org:
        updated = await AsyncOrm.update_employee(
            employee_id,
            org.id,
            full_name=mapped.get("full_name"),
            research_interests=mapped.get("research_interests"),
            education=mapped.get("education"),
            publications=mapped.get("publications"),
            hindex_openalex=mapped.get("hindex_openalex"),
        )
    else:
        updated = await AsyncOrm.update_employee_for_creator(
            employee_id,
            current_user.id,
            full_name=mapped.get("full_name"),
            research_interests=mapped.get("research_interests"),
            education=mapped.get("education"),
            publications=mapped.get("publications"),
            hindex_openalex=mapped.get("hindex_openalex"),
        )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    lab_ids = [l.id for l in (updated.laboratories or [])]
    if lab_ids:
        await reindex_laboratories_by_ids(lab_ids)
    logger.info("Employee OpenAlex import completed: employee_id=%s openalex_id=%s", employee_id, openalex_id)
    return updated


@router.delete("/organization/employees/{employee_id}")
async def delete_org_employee(employee_id: int, current_user=Depends(get_current_user)):
    has_published = await AsyncOrm.has_published_vacancies_as_contact_for_employee(employee_id)
    if has_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Снимите с публикации вакансии, где указан этот сотрудник как контакт, или смените контактное лицо, затем удалите сотрудника.",
        )
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    employee_before = None
    if org:
        employee_before = await AsyncOrm.get_employee(employee_id, org.id)
        deleted, user_id_to_notify, lab_names = await AsyncOrm.delete_employee(employee_id, org.id)
    elif is_lab_representative(current_user):
        employee_before = await AsyncOrm.get_employee_for_creator(employee_id, current_user.id)
        deleted, user_id_to_notify, lab_names = await AsyncOrm.delete_employee_for_creator(
            employee_id, current_user.id
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    lab_ids = [l.id for l in (employee_before.laboratories or [])] if employee_before else []
    if lab_ids:
        await reindex_laboratories_by_ids(lab_ids)
    if org:
        try:
            await reindex_organizations_by_ids([org.id])
        except Exception as e:
            logger.warning("Organization reindex failed after employee delete: org_id=%s %s", org.id, e)
    logger.info("Employee deleted: id=%s org_id=%s", employee_id, org.id if org else None)
    # Уведомление соискателю, что его отвязали от лаборатории
    if user_id_to_notify:
        await AsyncOrm.create_notification(
            user_id_to_notify,
            "lab_join_removed",
            {"lab_names": lab_names or ["лабораторию"]},
        )
    return {"status": "ok"}
