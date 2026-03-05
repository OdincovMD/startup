"""
Глобальный поиск по всем индексам (вакансии, организации, лаборатории, запросы).
"""

import asyncio
import logging
from typing import List

from .laboratories import _suggest_laboratories_with_source
from .organizations import _suggest_organizations_with_source
from .queries import _suggest_queries_with_source
from .vacancies import _suggest_vacancies_with_source

logger = logging.getLogger(__name__)


async def suggest_global(q: str = "", limit: int = 12) -> List[dict]:
    """
    Глобальные подсказки по всем сущностям.
    Возвращает [{type, public_id, title}, ...] для навигации на карточки.
    """
    q = (q or "").strip()
    if len(q) < 2:
        return []

    per_type = max(3, limit // 4)
    results = await asyncio.gather(
        _suggest_vacancies_with_source(q, per_type),
        _suggest_organizations_with_source(q, per_type),
        _suggest_laboratories_with_source(q, per_type),
        _suggest_queries_with_source(q, per_type),
    )

    items: List[dict] = []
    for entity_type, raw_list in zip(
        ("vacancy", "organization", "laboratory", "query"), results
    ):
        for r in raw_list:
            public_id = r.get("public_id")
            title = r.get("title") or r.get("text") or ""
            if public_id and title:
                items.append({
                    "type": entity_type,
                    "public_id": public_id,
                    "title": title,
                })
            if len(items) >= limit:
                break
        if len(items) >= limit:
            break

    return items[:limit]
