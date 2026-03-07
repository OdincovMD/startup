"""
Публичные роуты FastAPI для работы с вакансиями.
GET / — список опубликованных вакансий (поиск q, фильтры, пагинация),
GET /public/{public_id}/details — детали вакансии по public_id.
POST /public/{public_id}/respond — откликнуться (student/researcher).
GET /public/{public_id}/my-response — свой отклик по вакансии (если есть).
"""

import asyncio
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, get_current_user_optional
from app.config import settings
from app.roles.representative.schemas import VacancyOrganizationRead, VacancyResponseRead, VacancyListResponse
from app.queries.orm import Orm
from app.services.email import render_vacancy_response, send_vacancy_response_email
from app.services.elasticsearch import search_vacancies, suggest_vacancies

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _can_respond(user) -> bool:
    return user.role is not None and getattr(user.role, "name", "") in ("student", "researcher")


def _resolve_vacancy_contact_email(vacancy) -> Optional[str]:
    """Разрешить email контактного лица вакансии (Employee.contacts, Employee.user.mail или vacancy.contact_email)."""
    if getattr(vacancy, "contact_employee_id", None) and getattr(vacancy, "contact_employee", None):
        emp = vacancy.contact_employee
        contacts = getattr(emp, "contacts", None) or {}
        if isinstance(contacts, dict):
            email = contacts.get("email") or contacts.get("mail")
            if email and isinstance(email, str) and email.strip():
                return email.strip()
        if getattr(emp, "user_id", None) and getattr(emp, "user", None):
            mail = getattr(emp.user, "mail", None)
            if mail and isinstance(mail, str) and mail.strip():
                return mail.strip()
    email = getattr(vacancy, "contact_email", None)
    if email and isinstance(email, str) and email.strip():
        return email.strip()
    return None


def _resolve_vacancy_email_for_response(vacancy) -> Optional[str]:
    """
    Email для отправки отклика: контактное лицо или fallback на email создателя вакансии.
    Если у контакта нет email — используем mail создателя (личный аккаунт).
    """
    email = _resolve_vacancy_contact_email(vacancy)
    if email:
        return email
    creator = getattr(vacancy, "creator", None)
    if creator:
        mail = getattr(creator, "mail", None)
        if mail and isinstance(mail, str) and mail.strip():
            return mail.strip()
    return None


def _build_candidate_info_html(
    applicant_type: str,
    user: Any,
    student: Optional[Any],
    researcher: Optional[Any],
    use_researcher: bool = True,
) -> str:
    """Сформировать HTML-блок с информацией о кандидате. use_researcher — использовать профиль исследователя (иначе студента)."""
    parts: list[str] = []
    if use_researcher and researcher:
        if getattr(researcher, "position", None):
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Должность:</strong> {_escape_html(str(researcher.position))}</p>")
        if getattr(researcher, "academic_degree", None):
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Степень:</strong> {_escape_html(str(researcher.academic_degree))}</p>")
        ri = getattr(researcher, "research_interests", None)
        if ri and isinstance(ri, list) and ri:
            interests = ", ".join(str(x)[:100] for x in ri[:5])
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Научные интересы:</strong> {_escape_html(interests)}</p>")
        edu = getattr(researcher, "education", None)
        if edu and isinstance(edu, list) and edu:
            first = edu[0]
            inst = first.get("institution", str(first))[:80] if isinstance(first, dict) else str(first)[:80]
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Образование:</strong> {_escape_html(inst)}</p>")
        pubs = getattr(researcher, "publications", None)
        if pubs and isinstance(pubs, list) and pubs:
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Публикации:</strong> {len(pubs)}</p>")
        h_vals = []
        for attr in ("hindex_wos", "hindex_scopus", "hindex_openalex", "hindex_rsci"):
            v = getattr(researcher, attr, None)
            if v is not None:
                h_vals.append(f"{attr.replace('hindex_', '').upper()}: {v}")
        if h_vals:
            parts.append(f"<p style='margin: 0 0 8px;'><strong>H-index:</strong> {', '.join(h_vals)}</p>")
    elif not use_researcher and student:
        skills = getattr(student, "skills", None)
        if skills and isinstance(skills, list) and skills:
            skills_str = ", ".join(str(s)[:80] for s in skills[:10])
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Навыки:</strong> {_escape_html(skills_str)}</p>")
        if getattr(student, "summary", None):
            summary = str(student.summary)[:300]
            parts.append(f"<p style='margin: 0 0 8px;'><strong>О себе:</strong> {_escape_html(summary)}</p>")
        edu = getattr(student, "education", None)
        if edu and isinstance(edu, list) and edu:
            first = edu[0]
            inst = first.get("institution", str(first))[:80] if isinstance(first, dict) else str(first)[:80]
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Образование:</strong> {_escape_html(inst)}</p>")
        ri = getattr(student, "research_interests", None)
        if ri and isinstance(ri, list) and ri:
            interests = ", ".join(str(x)[:100] for x in ri[:5])
            parts.append(f"<p style='margin: 0 0 8px;'><strong>Интересы:</strong> {_escape_html(interests)}</p>")
    if not parts:
        parts.append("<p style='margin: 0; font-size: 0.875rem; color: #64748b;'>Дополнительная информация не указана.</p>")
    return "\n".join(parts)


def _escape_html(s: str) -> str:
    """Экранировать HTML-символы."""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _get_resume_url(
    student: Optional[Any],
    researcher: Optional[Any],
    role_name: str = "researcher",
) -> Optional[str]:
    """Получить URL резюме из профиля текущей роли: resume_url или первый из document_urls."""
    first, second = (researcher, student) if role_name == "researcher" else (student, researcher)
    for profile in (first, second):
        if not profile:
            continue
        url = getattr(profile, "resume_url", None)
        if url and isinstance(url, str) and url.strip():
            return url.strip()
        docs = getattr(profile, "document_urls", None)
        if docs and isinstance(docs, list) and docs:
            first = docs[0]
            if isinstance(first, str) and first.strip():
                return first.strip()
    return None


@router.get("/suggest")
async def suggest_vacancies_endpoint(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=20),
):
    """Подсказки для автодополнения поиска."""
    suggestions = await suggest_vacancies(q=q.strip(), limit=limit)
    return {"suggestions": suggestions}


@router.get("/", response_model=VacancyListResponse)
async def list_vacancies(
    q: str = "",
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    employment_type: Optional[str] = Query(None),
    organization_id: Optional[int] = Query(None),
    laboratory_id: Optional[int] = Query(None),
    sort_by: Optional[str] = Query(None, description="date_desc | date_asc"),
):
    """
    Список опубликованных вакансий.
    При q или фильтрах — поиск через Elasticsearch.
    Иначе — все из PostgreSQL.
    """
    q_stripped = (q or "").strip()
    use_es = bool(q_stripped) or employment_type or organization_id is not None or laboratory_id is not None

    if use_es:
        try:
            result = await search_vacancies(
                q=q_stripped,
                page=page,
                size=size,
                employment_type=employment_type,
                organization_id=organization_id,
                laboratory_id=laboratory_id,
                sort_by=sort_by,
            )
            return result
        except Exception:
            return {"items": [], "total": 0, "page": page, "size": size}

    try:
        vacancies = await Orm.list_published_vacancies()
        if sort_by == "date_asc":
            vacancies = sorted(vacancies, key=lambda v: getattr(v, "created_at") or "", reverse=False)
        else:
            vacancies = sorted(vacancies, key=lambda v: getattr(v, "created_at") or "", reverse=True)
        total = len(vacancies)
        start = (page - 1) * size
        items = vacancies[start : start + size]
        return {"items": items, "total": total, "page": page, "size": size}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VACANCY_LIST_FAILURE", "message": str(e)},
        )


@router.get("/public/{public_id}/details", response_model=VacancyOrganizationRead)
async def get_vacancy_details(public_id: str):
    """Публичная карточка вакансии по public_id (только опубликованные)."""
    vacancy = await Orm.get_vacancy_by_public_id(public_id)
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
    vacancy = await Orm.get_vacancy_by_public_id(public_id)
    if not vacancy or not getattr(vacancy, "is_published", False):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    try:
        resp = await Orm.create_vacancy_response(current_user.id, vacancy.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    applicant_name = getattr(current_user, "full_name", None) or getattr(current_user, "mail", "") or "Соискатель"
    role_name = getattr(current_user.role, "name", "") or ""
    researcher = await Orm.get_researcher_by_user(current_user.id)
    student = await Orm.get_student_by_user(current_user.id)
    use_researcher = role_name == "researcher"
    preview_parts = []
    if use_researcher and researcher:
        if getattr(researcher, "research_interests", None) and isinstance(researcher.research_interests, list):
            preview_parts.extend((researcher.research_interests or [])[:3])
        if getattr(researcher, "education", None) and isinstance(researcher.education, list) and researcher.education:
            first_edu = researcher.education[0]
            if isinstance(first_edu, dict):
                preview_parts.append(str(first_edu.get("institution", ""))[:80])
            else:
                preview_parts.append(str(first_edu)[:80])
    elif not use_researcher and student:
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
        await Orm.create_notification(
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
        for uid in await Orm.get_organization_representative_user_ids(org_id):
            if uid not in notified:
                await Orm.create_notification(uid, "vacancy_response_created", notification_data)
                notified.add(uid)

    # Email: контактному лицу или создателю вакансии (fallback на личный аккаунт)
    contact_email = _resolve_vacancy_email_for_response(vacancy)
    if contact_email:
        applicant_type = "Исследователь" if use_researcher else "Студент"
        applicant_email = getattr(current_user, "mail", "") or ""
        contacts = getattr(current_user, "contacts", None) or {}
        if isinstance(contacts, dict):
            applicant_phone = str(contacts.get("phone", "") or "").strip() or "—"
            applicant_telegram = str(contacts.get("telegram", "") or "").strip() or "—"
        else:
            applicant_phone = applicant_telegram = "—"
        candidate_info = _build_candidate_info_html(
            applicant_type, current_user, student, researcher, use_researcher=use_researcher
        )
        vacancy_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/vacancies/{vacancy.public_id}"
            if getattr(vacancy, "public_id", None)
            else f"{settings.FRONTEND_URL.rstrip('/')}/vacancies"
        )
        profile_url = ""
        profile_block = ""
        profile_block_txt = ""
        applicant_public_id = getattr(current_user, "public_id", None)
        if applicant_public_id:
            profile_url = f"{settings.FRONTEND_URL.rstrip('/')}/applicants/{applicant_public_id}"
            profile_block = (
                '<p style="margin: 0 0 20px; padding: 16px 20px; background-color: #f0fdf4; border-radius: 8px; '
                'border-left: 4px solid #22c55e; font-size: 0.875rem; color: #166534;">'
                f'<strong>Профиль кандидата:</strong> '
                f'<a href="{profile_url}" target="_blank" rel="noopener" style="color: #2563eb; font-weight: 600;">открыть ссылку</a></p>'
            )
            profile_block_txt = f"Профиль кандидата: {profile_url}"
        else:
            profile_block_txt = ""
        resume_url = _get_resume_url(student, researcher, role_name=role_name)
        if resume_url:
            resume_block = (
                f'<strong>Скачать резюме:</strong> '
                f'<a href="{resume_url}" target="_blank" rel="noopener" style="color: #2563eb; font-weight: 600;">открыть ссылку</a>'
            )
            resume_block_txt = f"Скачать резюме: {resume_url}"
        else:
            resume_block = "Резюме не указано в профиле кандидата."
            resume_block_txt = "Резюме не указано в профиле кандидата."
        subject = f"Отклик на вакансию «{vacancy.name}» — Синтезум"
        body_html, body_text = render_vacancy_response(
            applicant_type=applicant_type,
            applicant_name=applicant_name,
            applicant_email=applicant_email,
            applicant_phone=applicant_phone,
            applicant_telegram=applicant_telegram,
            vacancy_name=vacancy.name,
            vacancy_url=vacancy_url,
            candidate_info=candidate_info,
            profile_block=profile_block,
            profile_block_txt=profile_block_txt,
            resume_block=resume_block,
            resume_block_txt=resume_block_txt,
        )
        await asyncio.to_thread(
            send_vacancy_response_email,
            contact_email,
            subject,
            body_html,
            body_text,
        )

    return {"id": resp.id, "status": resp.status}


@router.get("/public/{public_id}/my-response")
async def get_my_response(public_id: str, current_user=Depends(get_current_user_optional)):
    """Отклик текущего пользователя на эту вакансию (или отсутствие)."""
    if current_user is None:
        return {"has_response": False}
    vacancy = await Orm.get_vacancy_by_public_id(public_id)
    if not vacancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    resp = await Orm.get_my_response_for_vacancy(current_user.id, vacancy.id)
    if not resp:
        return {"has_response": False}
    return {"has_response": True, "id": resp.id, "status": resp.status}
