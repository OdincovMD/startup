"""
Публичные роуты FastAPI для работы с вакансиями.
GET / — список опубликованных вакансий,
GET /public/{public_id}/details — детали вакансии по public_id.
POST /public/{public_id}/respond — откликнуться (student/researcher).
GET /public/{public_id}/my-response — свой отклик по вакансии (если есть).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_current_user_optional
from app.roles.representative.schemas import VacancyOrganizationRead, VacancyResponseRead
from app.queries.async_orm import AsyncOrm

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _can_respond(user) -> bool:
    return user.role is not None and getattr(user.role, "name", "") in ("student", "researcher")


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


@router.post("/public/{public_id}/respond", status_code=status.HTTP_201_CREATED)
async def respond_to_vacancy(public_id: str, current_user=Depends(get_current_user)):
    """Откликнуться на вакансию (роли student или researcher)."""
    if not _can_respond(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Откликаться могут только студенты и исследователи",
        )
    vacancy = await AsyncOrm.get_vacancy_by_public_id(public_id)
    if not vacancy or not getattr(vacancy, "is_published", False):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    try:
        resp = await AsyncOrm.create_vacancy_response(current_user.id, vacancy.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    applicant_name = getattr(current_user, "full_name", None) or getattr(current_user, "mail", "") or "Соискатель"
    researcher = await AsyncOrm.get_researcher_by_user(current_user.id)
    student = await AsyncOrm.get_student_by_user(current_user.id)
    preview_parts = []
    if researcher:
        if getattr(researcher, "research_interests", None) and isinstance(researcher.research_interests, list):
            preview_parts.extend((researcher.research_interests or [])[:3])
        if getattr(researcher, "education", None) and isinstance(researcher.education, list) and researcher.education:
            first_edu = researcher.education[0]
            if isinstance(first_edu, dict):
                preview_parts.append(str(first_edu.get("institution", ""))[:80])
            else:
                preview_parts.append(str(first_edu)[:80])
    elif student:
        preview_parts.append("Студент")
        if getattr(student, "direction", None):
            preview_parts.append(student.direction or "")
    applicant_preview = "; ".join(p for p in preview_parts if p) or None
    notification_data = {
        "response_id": resp.id,
        "vacancy_name": vacancy.name,
        "applicant_name": applicant_name,
        "applicant_preview": applicant_preview,
        "vacancy_public_id": vacancy.public_id,
    }
    notified = set()
    if vacancy.creator_user_id:
        await AsyncOrm.create_notification(
            vacancy.creator_user_id,
            "vacancy_response_created",
            notification_data,
        )
        notified.add(vacancy.creator_user_id)
    # Руководителю организации — если вакансия принадлежит организации (в т.ч. через присоединённую лабораторию)
    org_id = getattr(vacancy, "organization_id", None) or (
        getattr(vacancy.laboratory, "organization_id", None) if getattr(vacancy, "laboratory", None) else None
    )
    if org_id:
        for uid in await AsyncOrm.get_organization_representative_user_ids(org_id):
            if uid not in notified:
                await AsyncOrm.create_notification(uid, "vacancy_response_created", notification_data)
                notified.add(uid)
    return {"id": resp.id, "status": resp.status}


@router.get("/public/{public_id}/my-response")
async def get_my_response(public_id: str, current_user=Depends(get_current_user_optional)):
    """Отклик текущего пользователя на эту вакансию (или отсутствие)."""
    if current_user is None:
        return {"has_response": False}
    vacancy = await AsyncOrm.get_vacancy_by_public_id(public_id)
    if not vacancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    resp = await AsyncOrm.get_my_response_for_vacancy(current_user.id, vacancy.id)
    if not resp:
        return {"has_response": False}
    return {"has_response": True, "id": resp.id, "status": resp.status}
