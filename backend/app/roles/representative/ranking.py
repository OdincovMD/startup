"""
Расчёт коэффициента ранжирования (rank_score) и подсказок по улучшению для сущностей представителя.
Использует те же формулы, что и индексация в Elasticsearch (utils.calc_*_score).
"""

from typing import Any, Dict, List, Optional

from app.services.elasticsearch.utils import (
    calc_laboratory_score,
    calc_organization_score,
    calc_query_score,
    calc_vacancy_score,
)


def _created_at_iso(obj: Any) -> Optional[str]:
    """Получить created_at в ISO строке или None."""
    created = getattr(obj, "created_at", None)
    if created is None:
        return None
    if hasattr(created, "isoformat"):
        return created.isoformat()
    return str(created)


# ---------------------------------------------------------------------------
# Build doc from ORM (same shape as ES index doc for score calculation)
# ---------------------------------------------------------------------------


def build_doc_from_org(
    org: Any,
    laboratories_count: int = 0,
    employees_count: int = 0,
    vacancies_count: int = 0,
    queries_count: int = 0,
) -> Dict:
    """Собрать плоский doc для расчёта organization score."""
    return {
        "avatar_url": getattr(org, "avatar_url", None),
        "description": getattr(org, "description", None) or "",
        "website": getattr(org, "website", None),
        "ror_id": getattr(org, "ror_id", None),
        "address": getattr(org, "address", None),
        "laboratories_count": laboratories_count,
        "employees_count": employees_count,
        "vacancies_count": vacancies_count,
        "queries_count": queries_count,
        "created_at": _created_at_iso(org),
    }


def build_doc_from_lab(
    lab: Any,
    employees_count: int = 0,
    researchers_count: int = 0,
    equipment_count: int = 0,
) -> Dict:
    """Собрать плоский doc для расчёта laboratory score."""
    image_urls = getattr(lab, "image_urls", None)
    if image_urls is None:
        image_urls = []
    elif not isinstance(image_urls, list):
        image_urls = []
    return {
        "description": getattr(lab, "description", None) or "",
        "activities": getattr(lab, "activities", None),
        "image_urls": image_urls,
        "head_employee_id": getattr(lab, "head_employee_id", None),
        "has_organization": getattr(lab, "organization_id", None) is not None,
        "employees_count": employees_count,
        "researchers_count": researchers_count,
        "equipment_count": equipment_count,
        "created_at": _created_at_iso(lab),
    }


def build_doc_from_vacancy(vacancy: Any) -> Dict:
    """Собрать плоский doc для расчёта vacancy score."""
    return {
        "requirements": getattr(vacancy, "requirements", None),
        "description": getattr(vacancy, "description", None),
        "employment_type": getattr(vacancy, "employment_type", None),
        "contact_email": getattr(vacancy, "contact_email", None),
        "contact_phone": getattr(vacancy, "contact_phone", None),
        "organization_id": getattr(vacancy, "organization_id", None),
        "laboratory_id": getattr(vacancy, "laboratory_id", None),
        "created_at": _created_at_iso(vacancy),
    }


def build_doc_from_query(query: Any, laboratory_ids: Optional[List[int]] = None) -> Dict:
    """Собрать плоский doc для расчёта query score."""
    if laboratory_ids is None:
        laboratories = getattr(query, "laboratories", None) or []
        laboratory_ids = [getattr(l, "id", None) for l in laboratories if getattr(l, "id", None) is not None]
    return {
        "task_description": getattr(query, "task_description", None),
        "completed_examples": getattr(query, "completed_examples", None),
        "grant_info": getattr(query, "grant_info", None),
        "budget": getattr(query, "budget", None),
        "deadline": getattr(query, "deadline", None),
        "laboratory_ids": laboratory_ids or [],
        "created_at": _created_at_iso(query),
    }


# ---------------------------------------------------------------------------
# Score calculation (delegate to ES utils)
# ---------------------------------------------------------------------------


def get_organization_score(doc: Dict) -> float:
    return calc_organization_score(doc)


def get_laboratory_score(doc: Dict) -> float:
    return calc_laboratory_score(doc)


def get_vacancy_score(doc: Dict) -> float:
    return calc_vacancy_score(doc)


def get_query_score(doc: Dict) -> float:
    return calc_query_score(doc)


# ---------------------------------------------------------------------------
# Tips (what to improve) — mirror conditions from calc_* and docs
# ---------------------------------------------------------------------------


def get_organization_tips(doc: Dict) -> List[str]:
    """Подсказки по улучшению коэффициента организации."""
    tips = []
    if not doc.get("avatar_url"):
        tips.append("Добавьте логотип организации")
    desc = doc.get("description") or ""
    if len(desc) < 300:
        tips.append("Опишите организацию (не менее 300 символов)")
    if not doc.get("website"):
        tips.append("Укажите сайт")
    if not doc.get("ror_id"):
        tips.append("Укажите ROR ID")
    if not doc.get("address"):
        tips.append("Укажите адрес")
    if (doc.get("laboratories_count") or 0) < 1:
        tips.append("Добавьте хотя бы одну опубликованную лабораторию")
    tips.append("Чем новее обновления — тем выше балл за свежесть")
    return tips


def get_laboratory_tips(doc: Dict) -> List[str]:
    """Подсказки по улучшению коэффициента лаборатории."""
    tips = []
    desc = doc.get("description") or ""
    if len(desc) < 300:
        tips.append("Опишите лабораторию (не менее 300 символов)")
    if not doc.get("activities"):
        tips.append("Заполните направления деятельности")
    images = doc.get("image_urls") or []
    if len(images) < 2:
        tips.append("Добавьте не менее 2 фотографий")
    if not doc.get("head_employee_id"):
        tips.append("Укажите руководителя лаборатории")
    if not doc.get("has_organization"):
        tips.append("Привяжите лабораторию к организации")
    emp = doc.get("employees_count") or 0
    if emp < 2:
        tips.append("Добавьте сотрудников в карточку лаборатории")
    res = doc.get("researchers_count") or 0
    eq = doc.get("equipment_count") or 0
    if res == 0 and eq == 0:
        tips.append("Добавьте оборудование или исследователей")
    tips.append("Обновите карточку — свежесть даёт баллы")
    return tips


def get_vacancy_tips(doc: Dict) -> List[str]:
    """Подсказки по улучшению коэффициента вакансии."""
    tips = []
    if not doc.get("requirements"):
        tips.append("Заполните требования")
    if not doc.get("description"):
        tips.append("Добавьте описание вакансии")
    if not doc.get("employment_type"):
        tips.append("Укажите тип занятости")
    if not doc.get("contact_email") and not doc.get("contact_phone"):
        tips.append("Укажите контактный email или телефон")
    if doc.get("organization_id") is None and doc.get("laboratory_id") is None:
        tips.append("Привяжите вакансию к лаборатории или организации")
    tips.append("Обновите вакансию — свежесть даёт баллы")
    return tips


def get_query_tips(doc: Dict) -> List[str]:
    """Подсказки по улучшению коэффициента запроса."""
    tips = []
    if not doc.get("task_description"):
        tips.append("Опишите задачу")
    if not doc.get("completed_examples"):
        tips.append("Добавьте примеры выполненных работ")
    if not doc.get("grant_info"):
        tips.append("Укажите информацию о гранте")
    if not doc.get("budget"):
        tips.append("Укажите бюджет")
    if not doc.get("deadline"):
        tips.append("Укажите срок")
    lab_ids = doc.get("laboratory_ids") or []
    if len(lab_ids) < 1:
        tips.append("Привяжите хотя бы одну лабораторию")
    tips.append("Обновите запрос — свежесть даёт баллы")
    return tips
