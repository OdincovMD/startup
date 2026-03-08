"""
Индексация и поиск вакансий в Elasticsearch.
"""

import asyncio
import logging
from typing import Any, List, Optional

from elasticsearch.exceptions import NotFoundError
from elastic_transport import ConnectionTimeout

from app.config import settings

from .client import get_es_client
from .mappings import VACANCIES_INDEX_MAPPING
from .utils import extract_skills, significant_words, sort_by_date, sort_with_ranking

logger = logging.getLogger(__name__)


async def ensure_vacancies_index() -> None:
    """Создать индекс вакансий, если не существует. Ждёт готовности primary shard."""
    client = get_es_client()
    index = settings.VACANCIES_INDEX
    try:
        exists = await client.indices.exists(index=index)
        if not exists:
            await client.indices.create(index=index, body=VACANCIES_INDEX_MAPPING)
            logger.info("Created Elasticsearch index: %s", index)
        else:
            await client.indices.put_settings(
                index=index, body={"number_of_replicas": 0}
            )
            try:
                await client.indices.put_mapping(
                    index=index,
                    body={"properties": {"public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50}}},
                )
            except Exception:
                pass
        await client.cluster.health(
            index=index,
            wait_for_status="yellow",
            timeout=f"{settings.ELASTICSEARCH_REQUEST_TIMEOUT}s",
        )
    except Exception as e:
        logger.warning("Could not ensure vacancies index: %s", e)


async def _vacancies_index_count() -> int:
    """Количество документов в индексе вакансий. Возвращает 0 при ошибке."""
    client = get_es_client()
    try:
        resp = await client.count(index=settings.VACANCIES_INDEX)
        return resp.get("count", 0)
    except Exception:
        return 0


def _vacancy_to_doc(vacancy: Any) -> dict:
    """Преобразовать ORM-вакансию в документ для индекса."""
    org = getattr(vacancy, "organization", None)
    lab = getattr(vacancy, "laboratory", None)
    created = getattr(vacancy, "created_at", None)
    name = getattr(vacancy, "name", None) or ""
    requirements = getattr(vacancy, "requirements", None) or ""
    description = getattr(vacancy, "description", None) or ""
    employment_type = getattr(vacancy, "employment_type", None) or ""

    name_inputs = [name] + significant_words(name) + extract_skills(requirements, description)
    name_inputs = list(dict.fromkeys(s for s in name_inputs if s))

    lab_name = lab.name if lab else ""
    lab_inputs = [lab_name] + significant_words(lab_name) if lab_name else []
    lab_inputs = list(dict.fromkeys(s for s in lab_inputs if s))

    doc = {
        "id": vacancy.id,
        "public_id": getattr(vacancy, "public_id", None) or "",
        "name": name,
        "requirements": requirements,
        "description": description,
        "employment_type": employment_type,
        "organization_name": org.name if org else "",
        "laboratory_name": lab_name,
        "organization_id": getattr(vacancy, "organization_id", None),
        "laboratory_id": getattr(vacancy, "laboratory_id", None),
        "organization_public_id": getattr(org, "public_id", None) if org else None,
        "laboratory_public_id": getattr(lab, "public_id", None) if lab else None,
        "laboratory_created_at": (
            lab.created_at.isoformat() if lab and getattr(lab, "created_at", None) else None
        ),
        "organization_avatar_url": getattr(org, "avatar_url", None) if org else None,
        "is_published": getattr(vacancy, "is_published", False),
        "created_at": created.isoformat() if created else None,
        "paid_active": False,
        "rank_score": 0.0,
        "creator_user_id": getattr(vacancy, "creator_user_id", None),
    }
    from .utils import calc_vacancy_score
    doc["rank_score"] = calc_vacancy_score(doc)
    if name_inputs:
        doc["name_suggest"] = {"input": name_inputs, "weight": 2}
    if org and org.name:
        doc["organization_suggest"] = {"input": [org.name], "weight": 1}
    if lab_inputs:
        doc["laboratory_suggest"] = {"input": lab_inputs, "weight": 1}
    if employment_type:
        doc["employment_suggest"] = {"input": [employment_type], "weight": 1}
    pid = getattr(vacancy, "public_id", None)
    if pid:
        doc["public_id_suggest"] = {"input": [pid], "weight": 2}
    return doc


def _doc_to_vacancy_item(doc: dict) -> dict:
    """Преобразовать документ ES в формат VacancyOrganizationRead для API."""
    source = doc.get("_source", doc)
    org_id = source.get("organization_id")
    lab_id = source.get("laboratory_id")
    org_short = None
    if org_id is not None:
        org_short = {
            "id": org_id,
            "public_id": source.get("organization_public_id"),
            "name": source.get("organization_name", ""),
            "avatar_url": source.get("organization_avatar_url"),
        }
    lab_short = None
    if lab_id is not None:
        lab_created = source.get("laboratory_created_at") or source.get("created_at")
        lab_short = {
            "id": lab_id,
            "public_id": source.get("laboratory_public_id"),
            "name": source.get("laboratory_name", ""),
            "created_at": lab_created,
            "organization_id": org_id,
        }
    created = source.get("created_at")
    return {
        "id": source.get("id"),
        "public_id": source.get("public_id"),
        "name": source.get("name", ""),
        "requirements": source.get("requirements"),
        "description": source.get("description"),
        "employment_type": source.get("employment_type"),
        "created_at": created,
        "organization": org_short,
        "laboratory": lab_short,
        "organization_id": org_id,
        "laboratory_id": lab_id,
    }


async def _resolve_paid_active(doc: dict, paid_user_ids: set = None) -> None:
    """Set paid_active on doc based on creator's subscription status."""
    creator_id = doc.get("creator_user_id")
    if creator_id is None:
        return
    if paid_user_ids is not None:
        doc["paid_active"] = creator_id in paid_user_ids
    else:
        from app.core.queries.orm import Orm as CoreOrm
        doc["paid_active"] = await CoreOrm.has_active_subscription(creator_id)


async def index_vacancy(vacancy: Any, paid_user_ids: set = None) -> None:
    """Проиндексировать вакансию в Elasticsearch. Повтор при ConnectionTimeout."""
    if not getattr(vacancy, "is_published", False):
        return
    client = get_es_client()
    doc = _vacancy_to_doc(vacancy)
    await _resolve_paid_active(doc, paid_user_ids)
    last_err = None
    for attempt in range(3):
        try:
            await client.index(
                index=settings.VACANCIES_INDEX,
                id=str(vacancy.id),
                document=doc,
                request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
            )
            logger.debug("Indexed vacancy id=%s", vacancy.id)
            return
        except ConnectionTimeout as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.exception("Failed to index vacancy id=%s: %s", vacancy.id, e)
            return
    logger.warning("Failed to index vacancy id=%s after retries: %s", vacancy.id, last_err)


async def delete_vacancy(vacancy_id: int) -> None:
    """Удалить вакансию из индекса."""
    client = get_es_client()
    try:
        await client.delete(index=settings.VACANCIES_INDEX, id=str(vacancy_id), ignore=[404])
        logger.debug("Deleted vacancy id=%s from index", vacancy_id)
    except Exception as e:
        logger.exception("Failed to delete vacancy id=%s from index: %s", vacancy_id, e)


async def suggest_vacancies(q: str = "", limit: int = 10) -> List[str]:
    """
    Подсказки для автодополнения поиска (Completion Suggester).
    Возвращает список уникальных строк до limit элементов.
    """
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.VACANCIES_INDEX
    suggest_body = {
        "name-suggest": {
            "prefix": q,
            "completion": {
                "field": "name_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "org-suggest": {
            "prefix": q,
            "completion": {
                "field": "organization_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "lab-suggest": {
            "prefix": q,
            "completion": {
                "field": "laboratory_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "employment-suggest": {
            "prefix": q,
            "completion": {
                "field": "employment_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "public_id-suggest": {
            "prefix": q,
            "completion": {
                "field": "public_id_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
    }
    try:
        resp = await client.search(index=index, suggest=suggest_body, size=0)
    except NotFoundError:
        return []
    except Exception as e:
        logger.exception("Elasticsearch suggest failed: %s", e)
        return []
    seen = set()
    result: List[str] = []
    for key in ("name-suggest", "org-suggest", "lab-suggest", "employment-suggest", "public_id-suggest"):
        suggest_data = resp.get("suggest", {}).get(key, [])
        for opt in suggest_data:
            for item in opt.get("options", []):
                text = item.get("text")
                if text and text not in seen:
                    seen.add(text)
                    result.append(text)
                    if len(result) >= limit:
                        return result[:limit]
    return result[:limit]


async def _suggest_vacancies_with_source(
    q: str = "", limit: int = 10
) -> List[dict]:
    """Подсказки с public_id и title для глобального поиска. Возвращает [{text, public_id, title}]."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.VACANCIES_INDEX
    comp = {"size": limit, "skip_duplicates": True, "fuzzy": {"fuzziness": "AUTO"}}
    suggest_body = {
        "name-suggest": {"prefix": q, "completion": {**comp, "field": "name_suggest"}},
        "org-suggest": {"prefix": q, "completion": {**comp, "field": "organization_suggest"}},
        "lab-suggest": {"prefix": q, "completion": {**comp, "field": "laboratory_suggest"}},
        "employment-suggest": {"prefix": q, "completion": {**comp, "field": "employment_suggest"}},
        "public_id-suggest": {"prefix": q, "completion": {**comp, "field": "public_id_suggest"}},
    }
    body = {"suggest": suggest_body, "size": 0, "_source": ["public_id", "name"]}
    try:
        resp = await client.search(index=index, body=body)
    except NotFoundError:
        return []
    except Exception as e:
        logger.exception("Elasticsearch suggest failed: %s", e)
        return []
    seen: set = set()
    result: List[dict] = []
    for key in ("name-suggest", "org-suggest", "lab-suggest", "employment-suggest", "public_id-suggest"):
        suggest_data = resp.get("suggest", {}).get(key, [])
        for opt in suggest_data:
            for item in opt.get("options", []):
                text = item.get("text")
                source = item.get("_source", {})
                public_id = source.get("public_id") or ""
                title = source.get("name") or text or ""
                if text and public_id and (public_id, text) not in seen:
                    seen.add((public_id, text))
                    result.append({"text": text, "public_id": public_id, "title": title})
                    if len(result) >= limit:
                        return result[:limit]
    return result[:limit]


async def search_vacancies(
    q: str = "",
    page: int = 1,
    size: int = 20,
    sort_by: Optional[str] = None,
    employment_type: Optional[str] = None,
    organization_id: Optional[int] = None,
    laboratory_id: Optional[int] = None,
) -> dict:
    """
    Поиск вакансий по запросу и фильтрам.
    При пустом q — match_all (все опубликованные с учётом фильтров).
    Возвращает {items: [...], total: int, page: int, size: int}.
    """
    client = get_es_client()
    index = settings.VACANCIES_INDEX
    q = (q or "").strip()
    from_idx = (page - 1) * size

    filters = [{"term": {"is_published": True}}]
    if employment_type and employment_type.strip():
        et = employment_type.strip()
        filters.append({"match_phrase": {"employment_type": et}})
    if organization_id is not None:
        filters.append({"term": {"organization_id": organization_id}})
    if laboratory_id is not None:
        filters.append({"term": {"laboratory_id": laboratory_id}})

    if q:
        search_fields = [
            "name^2",
            "requirements",
            "description",
            "employment_type",
            "organization_name",
            "laboratory_name",
            "public_id",
        ]
        base_query = {
            "bool": {
                "must": [
                    {"multi_match": {"query": q, "fields": search_fields, "type": "best_fields"}},
                ],
                "filter": filters,
            }
        }
        query = {
            "function_score": {
                "query": base_query,
                "functions": [
                    {"filter": {"term": {"paid_active": True}}, "weight": 2}
                ],
                "boost_mode": "multiply",
                "score_mode": "sum",
            }
        }
    else:
        query = {"bool": {"must": [{"match_all": {}}], "filter": filters}}

    sort_clause = sort_with_ranking(sort_by)
    try:
        resp = await client.search(
            index=index,
            query=query,
            from_=from_idx,
            size=size,
            sort=sort_clause,
        )
    except NotFoundError:
        await reindex_vacancies_if_empty()
        try:
            resp = await client.search(
                index=index,
                query=query,
                from_=from_idx,
                size=size,
                sort=sort_clause,
            )
        except Exception as e:
            logger.exception("Elasticsearch search failed after index init: %s", e)
            return {"items": [], "total": 0, "page": page, "size": size}
    except Exception as e:
        logger.exception("Elasticsearch search failed: %s", e)
        return {"items": [], "total": 0, "page": page, "size": size}

    hits = resp.get("hits", {})
    total_val = hits.get("total")
    if isinstance(total_val, dict):
        total = total_val.get("value", 0)
    else:
        total = total_val or 0

    items = [_doc_to_vacancy_item(h) for h in hits.get("hits", [])]
    return {"items": items, "total": total, "page": page, "size": size}


async def reindex_vacancies_if_empty() -> None:
    """
    Первичная индексация: если индекс вакансий пуст — загрузить все
    опубликованные вакансии из PostgreSQL и проиндексировать.
    Вызывается при старте приложения.
    """
    await reindex_vacancies(force=False)


async def reindex_vacancies(force: bool = False) -> int:
    """
    Переиндексация вакансий из PostgreSQL в Elasticsearch.
    force=True — всегда переиндексировать; force=False — только если индекс пуст.
    Возвращает количество проиндексированных документов.
    """
    await ensure_vacancies_index()
    count = await _vacancies_index_count()
    if not force and count > 0:
        logger.debug("Vacancies index already has %d documents, skipping reindex", count)
        return count
    from app.queries.orm import Orm
    vacancies = await Orm.list_published_vacancies()
    creator_ids = [v.creator_user_id for v in vacancies if v.creator_user_id]
    from app.core.queries.orm import Orm as CoreOrm
    paid_ids = await CoreOrm.get_paid_user_ids(creator_ids)
    logger.info("Vacancies reindex: %d published vacancies", len(vacancies))
    indexed = 0
    for v in vacancies:
        try:
            await index_vacancy(v, paid_user_ids=paid_ids)
            indexed += 1
        except Exception as e:
            logger.warning("Failed to index vacancy id=%s: %s", v.id, e)
    logger.info("Reindex completed: %d vacancies indexed", indexed)
    return indexed
