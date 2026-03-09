"""
Вспомогательные функции для Elasticsearch (парсинг, сортировка).
"""

import math
import re
from typing import List, Optional


def extract_skills(requirements: Optional[str], description: Optional[str], max_skills: int = 8) -> List[str]:
    """Извлечь навыки из requirements и description (разбивка по [,;\\n·])."""
    text = " ".join(filter(None, [requirements or "", description or ""]))
    if not text.strip():
        return []
    parts = re.split(r"[,;\n·]", text)
    skills = [s.strip() for s in parts if s and 0 < len(s.strip()) <= 40]
    return list(dict.fromkeys(skills))[:max_skills]


def significant_words(text: Optional[str]) -> List[str]:
    """Слова длиной > 2 из текста."""
    if not text:
        return []
    return [w for w in text.split() if len(w) > 2]


def escape_wildcard(val: str) -> str:
    """Экранировать * и ? для wildcard-запроса Elasticsearch."""
    return (val or "").replace("\\", "\\\\").replace("*", "\\*").replace("?", "\\?")


def sort_by_date(sort_by: Optional[str], default_desc: bool = True) -> list:
    """Вернуть sort для ES: [{"created_at": {"order": "desc"|"asc"}}]."""
    if sort_by == "date_asc":
        return [{"created_at": {"order": "asc"}}]
    return [{"created_at": {"order": "desc"}}]


def sort_with_ranking(
    sort_by: Optional[str],
    default_desc: bool = True,
    use_query_score: bool = False,
) -> list:
    """Sort clause: paid first, then by rank_score or _score, then by date."""
    score_field = "_score" if use_query_score else "rank_score"
    if sort_by == "date_asc":
        return [
            {"paid_active": {"order": "desc", "missing": "_last"}},
            {score_field: {"order": "desc", "missing": "_last"}},
            {"created_at": {"order": "asc"}},
        ]
    return [
        {"paid_active": {"order": "desc", "missing": "_last"}},
        {score_field: {"order": "desc", "missing": "_last"}},
        {"created_at": {"order": "desc"}},
    ]


def _freshness_score(created_at_iso: Optional[str], fast_decay: bool = False) -> float:
    """Calculate freshness score based on age of the entity."""
    if not created_at_iso:
        return 2.0
    from datetime import datetime, timezone
    try:
        if isinstance(created_at_iso, str):
            created = datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
        else:
            created = created_at_iso
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - created).days
    except Exception:
        return 2.0
    if fast_decay:
        if age_days <= 7:
            return 20.0
        if age_days <= 21:
            return 14.0
        if age_days <= 45:
            return 8.0
        return 3.0
    if age_days <= 14:
        return 15.0
    if age_days <= 30:
        return 10.0
    if age_days <= 90:
        return 6.0
    return 2.0


def _performance_score_organization(
    unique_views_30d: int = 0,
    avg_time_on_page_sec: Optional[float] = None,
) -> float:
    """
    Performance component (0..20) for organization rank_score.
    +10 from log1p(unique_views_30d) normalized; +10 from avg_time_on_page_sec normalized.
    """
    views_score = 0.0
    if unique_views_30d and unique_views_30d > 0:
        # 300 unique views in 30d -> 10 points
        log_cap = math.log1p(300)
        views_score = min(10.0, 10.0 * math.log1p(unique_views_30d) / log_cap)
    time_score = 0.0
    if avg_time_on_page_sec is not None and avg_time_on_page_sec > 0:
        # 300 sec avg -> 10 points
        time_score = min(10.0, 10.0 * min(1.0, avg_time_on_page_sec / 300.0))
    return round(views_score + time_score, 2)


def calc_organization_score(doc: dict) -> float:
    """Calculate rank_score for an organization document (0..100)."""
    quality = 0.0
    if doc.get("avatar_url"):
        quality += 8
    desc = doc.get("description") or ""
    if len(desc) >= 300:
        quality += 10
    if doc.get("website"):
        quality += 6
    if doc.get("ror_id"):
        quality += 8
    if doc.get("address"):
        quality += 5
    labs_count = doc.get("laboratories_count") or 0
    if labs_count >= 1:
        quality += 8

    freshness = _freshness_score(doc.get("created_at"))

    performance = _performance_score_organization(
        unique_views_30d=doc.get("unique_views_30d") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
    )

    structure = 0.0
    structure += min(labs_count, 4) * 2
    employees_count = doc.get("employees_count") or 0
    structure += min(employees_count, 6)
    structure += min(doc.get("vacancies_count", 0) + doc.get("queries_count", 0), 6)

    return round(quality + freshness + performance + structure, 2)


def calc_organization_score_breakdown(doc: dict) -> dict:
    """Return rank_score and components (quality_score, freshness_score, performance_score, structure_score) for ES."""
    quality = 0.0
    if doc.get("avatar_url"):
        quality += 8
    desc = doc.get("description") or ""
    if len(desc) >= 300:
        quality += 10
    if doc.get("website"):
        quality += 6
    if doc.get("ror_id"):
        quality += 8
    if doc.get("address"):
        quality += 5
    labs_count = doc.get("laboratories_count") or 0
    if labs_count >= 1:
        quality += 8

    freshness = _freshness_score(doc.get("created_at"))
    performance = _performance_score_organization(
        unique_views_30d=doc.get("unique_views_30d") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
    )
    structure = 0.0
    structure += min(labs_count, 4) * 2
    employees_count = doc.get("employees_count") or 0
    structure += min(employees_count, 6)
    structure += min(doc.get("vacancies_count", 0) + doc.get("queries_count", 0), 6)

    total = round(quality + freshness + performance + structure, 2)
    return {
        "quality_score": round(quality, 2),
        "freshness_score": round(freshness, 2),
        "performance_score": round(performance, 2),
        "structure_score": round(structure, 2),
        "rank_score": total,
    }


def _performance_score_laboratory(
    unique_views_30d: int = 0,
    avg_time_on_page_sec: Optional[float] = None,
    cta_clicks_30d: int = 0,
) -> float:
    """Performance (0..25) for laboratory: views 10, time 10, CTA 5."""
    views_score = 0.0
    if unique_views_30d and unique_views_30d > 0:
        log_cap = math.log1p(300)
        views_score = min(10.0, 10.0 * math.log1p(unique_views_30d) / log_cap)
    time_score = 0.0
    if avg_time_on_page_sec is not None and avg_time_on_page_sec > 0:
        time_score = min(10.0, 10.0 * min(1.0, avg_time_on_page_sec / 300.0))
    cta_score = min(5.0, cta_clicks_30d * 1.0)  # 5 clicks -> 5 points, cap 5
    return round(views_score + time_score + cta_score, 2)


def calc_laboratory_score(doc: dict) -> float:
    """Calculate rank_score for a laboratory document (0..100)."""
    quality = 0.0
    desc = doc.get("description") or ""
    if len(desc) >= 300:
        quality += 10
    if doc.get("activities"):
        quality += 8
    images = doc.get("image_urls") or []
    if len(images) >= 2:
        quality += 8
    if doc.get("head_employee_id"):
        quality += 6
    if doc.get("has_organization"):
        quality += 8

    team = 0.0
    team += min(doc.get("employees_count") or 0, 4) * 2
    team += min(doc.get("researchers_count") or 0, 3) * 2
    team += min(doc.get("equipment_count") or 0, 3) * 2

    freshness = _freshness_score(doc.get("created_at"))

    performance = _performance_score_laboratory(
        unique_views_30d=doc.get("unique_views_30d") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
        cta_clicks_30d=doc.get("cta_clicks_30d") or 0,
    )

    return round(quality + team + freshness + performance, 2)


def calc_laboratory_score_breakdown(doc: dict) -> dict:
    """Return rank_score and components (quality_score, team_score, freshness_score, performance_score) for ES."""
    quality = 0.0
    desc = doc.get("description") or ""
    if len(desc) >= 300:
        quality += 10
    if doc.get("activities"):
        quality += 8
    images = doc.get("image_urls") or []
    if len(images) >= 2:
        quality += 8
    if doc.get("head_employee_id"):
        quality += 6
    if doc.get("has_organization"):
        quality += 8

    team = 0.0
    team += min(doc.get("employees_count") or 0, 4) * 2
    team += min(doc.get("researchers_count") or 0, 3) * 2
    team += min(doc.get("equipment_count") or 0, 3) * 2

    freshness = _freshness_score(doc.get("created_at"))
    performance = _performance_score_laboratory(
        unique_views_30d=doc.get("unique_views_30d") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
        cta_clicks_30d=doc.get("cta_clicks_30d") or 0,
    )
    total = round(quality + team + freshness + performance, 2)
    return {
        "quality_score": round(quality, 2),
        "team_score": round(team, 2),
        "freshness_score": round(freshness, 2),
        "performance_score": round(performance, 2),
        "rank_score": total,
    }


def _performance_score_vacancy(
    unique_viewers_30d: int = 0,
    response_count: int = 0,
    avg_time_on_page_sec: Optional[float] = None,
) -> float:
    """Performance (0..20) for vacancy: log1p(unique_viewers) 8, conversion 8, time 4."""
    views_score = 0.0
    if unique_viewers_30d and unique_viewers_30d > 0:
        log_cap = math.log1p(200)
        views_score = min(8.0, 8.0 * math.log1p(unique_viewers_30d) / log_cap)
    conversion = (response_count + 3) / (unique_viewers_30d + 30) if (unique_viewers_30d + 30) > 0 else 0
    conversion_score = min(8.0, conversion * 20)  # 0.4 conversion -> 8 points
    time_score = 0.0
    if avg_time_on_page_sec is not None and avg_time_on_page_sec > 0:
        time_score = min(4.0, 4.0 * min(1.0, avg_time_on_page_sec / 300.0))
    return round(views_score + conversion_score + time_score, 2)


def calc_vacancy_score(doc: dict) -> float:
    """Calculate rank_score for a vacancy document (0..100)."""
    quality = 0.0
    if doc.get("requirements"):
        quality += 7
    if doc.get("description"):
        quality += 7
    if doc.get("employment_type"):
        quality += 4
    if doc.get("contact_email") or doc.get("contact_phone"):
        quality += 4
    if doc.get("organization_id") is not None or doc.get("laboratory_id") is not None:
        quality += 3

    freshness = _freshness_score(doc.get("created_at"), fast_decay=True)

    performance = _performance_score_vacancy(
        unique_viewers_30d=doc.get("unique_viewers_30d") or 0,
        response_count=doc.get("response_count") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
    )

    return round(quality + freshness + performance, 2)


def calc_vacancy_score_breakdown(doc: dict) -> dict:
    """Return rank_score and components (quality_score, freshness_score, performance_score) for ES."""
    quality = 0.0
    if doc.get("requirements"):
        quality += 7
    if doc.get("description"):
        quality += 7
    if doc.get("employment_type"):
        quality += 4
    if doc.get("contact_email") or doc.get("contact_phone"):
        quality += 4
    if doc.get("organization_id") is not None or doc.get("laboratory_id") is not None:
        quality += 3

    freshness = _freshness_score(doc.get("created_at"), fast_decay=True)
    performance = _performance_score_vacancy(
        unique_viewers_30d=doc.get("unique_viewers_30d") or 0,
        response_count=doc.get("response_count") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
    )
    total = round(quality + freshness + performance, 2)
    return {
        "quality_score": round(quality, 2),
        "freshness_score": round(freshness, 2),
        "performance_score": round(performance, 2),
        "rank_score": total,
    }


def _performance_score_query(
    unique_views_30d: int = 0,
    avg_time_on_page_sec: Optional[float] = None,
) -> float:
    """Performance (0..20) for query: views 10, time 10 (per spec)."""
    views_score = 0.0
    if unique_views_30d and unique_views_30d > 0:
        log_cap = math.log1p(300)
        views_score = min(10.0, 10.0 * math.log1p(unique_views_30d) / log_cap)
    time_score = 0.0
    if avg_time_on_page_sec is not None and avg_time_on_page_sec > 0:
        time_score = min(10.0, 10.0 * min(1.0, avg_time_on_page_sec / 300.0))
    return round(views_score + time_score, 2)


def calc_query_score(doc: dict) -> float:
    """Calculate rank_score for a query document (0..100)."""
    quality = 0.0
    if doc.get("task_description"):
        quality += 8
    if doc.get("completed_examples"):
        quality += 6
    if doc.get("grant_info"):
        quality += 4
    if doc.get("budget"):
        quality += 4
    if doc.get("deadline"):
        quality += 4
    lab_ids = doc.get("laboratory_ids") or []
    if len(lab_ids) >= 1:
        quality += 4

    freshness = _freshness_score(doc.get("created_at"))

    performance = _performance_score_query(
        unique_views_30d=doc.get("unique_views_30d") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
    )

    return round(quality + freshness + performance, 2)


def calc_query_score_breakdown(doc: dict) -> dict:
    """Return rank_score and components (quality_score, freshness_score, performance_score) for ES."""
    quality = 0.0
    if doc.get("task_description"):
        quality += 8
    if doc.get("completed_examples"):
        quality += 6
    if doc.get("grant_info"):
        quality += 4
    if doc.get("budget"):
        quality += 4
    if doc.get("deadline"):
        quality += 4
    lab_ids = doc.get("laboratory_ids") or []
    if len(lab_ids) >= 1:
        quality += 4

    freshness = _freshness_score(doc.get("created_at"))
    performance = _performance_score_query(
        unique_views_30d=doc.get("unique_views_30d") or 0,
        avg_time_on_page_sec=doc.get("avg_time_on_page_sec"),
    )
    total = round(quality + freshness + performance, 2)
    return {
        "quality_score": round(quality, 2),
        "freshness_score": round(freshness, 2),
        "performance_score": round(performance, 2),
        "rank_score": total,
    }
