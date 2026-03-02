"""
Сервис Elasticsearch для полнотекстового поиска.
Индексация и поиск вакансий и запросов организаций.
"""

import asyncio
import logging
import re
from typing import Any, List, Optional

from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import NotFoundError
from elastic_transport import ConnectionTimeout

from app.config import settings

logger = logging.getLogger(__name__)

_es_client: Optional[AsyncElasticsearch] = None


def get_es_client() -> AsyncElasticsearch:
    """Получить async-клиент Elasticsearch (singleton)."""
    global _es_client
    if _es_client is None:
        _es_client = AsyncElasticsearch(
            hosts=[settings.ELASTICSEARCH_URL],
            request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
        )
    return _es_client


VACANCIES_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},  # single-node: реплики не нужны
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "standard"},
            "requirements": {"type": "text", "analyzer": "standard"},
            "description": {"type": "text", "analyzer": "standard"},
            "employment_type": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
            "organization_name": {"type": "text", "analyzer": "standard"},
            "laboratory_name": {"type": "text", "analyzer": "standard"},
            "organization_id": {"type": "integer"},
            "laboratory_id": {"type": "integer"},
            "organization_public_id": {"type": "keyword"},
            "laboratory_public_id": {"type": "keyword"},
            "laboratory_created_at": {"type": "date"},
            "organization_avatar_url": {"type": "keyword", "index": False},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "name_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "organization_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "laboratory_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "employment_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 30},
        }
    }
}

QUERIES_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "title": {"type": "text", "analyzer": "standard"},
            "task_description": {"type": "text", "analyzer": "standard"},
            "completed_examples": {"type": "text", "analyzer": "standard"},
            "grant_info": {"type": "text", "analyzer": "standard"},
            "budget": {"type": "keyword"},
            "deadline": {"type": "keyword"},
            "status": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
            "organization_name": {"type": "text", "analyzer": "standard"},
            "organization_id": {"type": "integer"},
            "organization_public_id": {"type": "keyword"},
            "organization_avatar_url": {"type": "keyword", "index": False},
            "laboratory_ids": {"type": "integer"},
            "deadline_year": {"type": "integer"},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "title_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "organization_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "status_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 30},
        }
    }
}


def _extract_skills(requirements: Optional[str], description: Optional[str], max_skills: int = 8) -> List[str]:
    """Извлечь навыки из requirements и description (разбивка по [,;\\n·])."""
    text = " ".join(filter(None, [requirements or "", description or ""]))
    if not text.strip():
        return []
    parts = re.split(r"[,;\n·]", text)
    skills = [s.strip() for s in parts if s and 0 < len(s.strip()) <= 40]
    return list(dict.fromkeys(skills))[:max_skills]


def _significant_words(text: Optional[str]) -> List[str]:
    """Слова длиной > 2 из текста."""
    if not text:
        return []
    return [w for w in text.split() if len(w) > 2]


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
    from app.queries.async_orm import AsyncOrm
    vacancies = await AsyncOrm.list_published_vacancies()
    logger.info("Vacancies reindex: %d published vacancies", len(vacancies))
    indexed = 0
    for v in vacancies:
        try:
            await index_vacancy(v)
            indexed += 1
        except Exception as e:
            logger.warning("Failed to index vacancy id=%s: %s", v.id, e)
    logger.info("Reindex completed: %d vacancies indexed", indexed)
    return indexed


def _vacancy_to_doc(vacancy: Any) -> dict:
    """Преобразовать ORM-вакансию в документ для индекса."""
    org = getattr(vacancy, "organization", None)
    lab = getattr(vacancy, "laboratory", None)
    created = getattr(vacancy, "created_at", None)
    name = getattr(vacancy, "name", None) or ""
    requirements = getattr(vacancy, "requirements", None) or ""
    description = getattr(vacancy, "description", None) or ""
    employment_type = getattr(vacancy, "employment_type", None) or ""

    name_inputs = [name] + _significant_words(name) + _extract_skills(requirements, description)
    name_inputs = list(dict.fromkeys(s for s in name_inputs if s))

    lab_name = lab.name if lab else ""
    lab_inputs = [lab_name] + _significant_words(lab_name) if lab_name else []
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
    }
    if name_inputs:
        doc["name_suggest"] = {"input": name_inputs, "weight": 2}
    if org and org.name:
        doc["organization_suggest"] = {"input": [org.name], "weight": 1}
    if lab_inputs:
        doc["laboratory_suggest"] = {"input": lab_inputs, "weight": 1}
    if employment_type:
        doc["employment_suggest"] = {"input": [employment_type], "weight": 1}
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


async def index_vacancy(vacancy: Any) -> None:
    """Проиндексировать вакансию в Elasticsearch. Повтор при ConnectionTimeout."""
    if not getattr(vacancy, "is_published", False):
        return
    client = get_es_client()
    doc = _vacancy_to_doc(vacancy)
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
    for key in ("name-suggest", "org-suggest", "lab-suggest", "employment-suggest"):
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


async def search_vacancies(
    q: str = "",
    page: int = 1,
    size: int = 20,
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
        ]
        query = {
            "bool": {
                "must": [
                    {"multi_match": {"query": q, "fields": search_fields, "type": "best_fields"}},
                ],
                "filter": filters,
            }
        }
    else:
        query = {"bool": {"must": [{"match_all": {}}], "filter": filters}}

    try:
        resp = await client.search(
            index=index,
            query=query,
            from_=from_idx,
            size=size,
            sort=[{"created_at": {"order": "desc"}}],
        )
    except NotFoundError:
        await reindex_vacancies_if_empty()
        try:
            resp = await client.search(
                index=index,
                query=query,
                from_=from_idx,
                size=size,
                sort=[{"created_at": {"order": "desc"}}],
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


# =====================
# QUERIES INDEX
# =====================


async def ensure_queries_index() -> None:
    """Создать индекс запросов, если не существует."""
    client = get_es_client()
    index = settings.QUERIES_INDEX
    try:
        exists = await client.indices.exists(index=index)
        if not exists:
            await client.indices.create(index=index, body=QUERIES_INDEX_MAPPING)
            logger.info("Created Elasticsearch index: %s", index)
        else:
            await client.indices.put_settings(index=index, body={"number_of_replicas": 0})
            # Добавить новые поля в маппинг, если их ещё нет
            new_props = {
                "properties": {
                    "laboratory_ids": {"type": "integer"},
                    "deadline_year": {"type": "integer"},
                }
            }
            await client.indices.put_mapping(index=index, body=new_props)
        await client.cluster.health(
            index=index,
            wait_for_status="yellow",
            timeout=f"{settings.ELASTICSEARCH_REQUEST_TIMEOUT}s",
        )
    except Exception as e:
        logger.warning("Could not ensure queries index: %s", e)


async def _queries_index_count() -> int:
    """Количество документов в индексе запросов."""
    client = get_es_client()
    try:
        resp = await client.count(index=settings.QUERIES_INDEX)
        return resp.get("count", 0)
    except Exception:
        return 0


def _query_to_doc(query: Any) -> dict:
    """Преобразовать ORM-запрос в документ для индекса."""
    org = getattr(query, "organization", None)
    created = getattr(query, "created_at", None)
    title = getattr(query, "title", None) or ""
    task_desc = getattr(query, "task_description", None) or ""
    completed = getattr(query, "completed_examples", None) or ""
    grant_info = getattr(query, "grant_info", None) or ""
    status_val = getattr(query, "status", None) or ""

    title_inputs = [title] + _significant_words(title)
    for t in [task_desc, completed, grant_info]:
        title_inputs.extend(_significant_words(t))
    title_inputs = list(dict.fromkeys(s for s in title_inputs if s and len(s) <= 50))

    laboratories = getattr(query, "laboratories", None) or []
    laboratory_ids = [lab.id for lab in laboratories if getattr(lab, "id", None) is not None]

    deadline_str = getattr(query, "deadline", None) or ""
    deadline_year = None
    if deadline_str:
        year_match = re.search(r"\b(19|20)\d{2}\b", deadline_str)
        if year_match:
            deadline_year = int(year_match.group(0))

    doc = {
        "id": query.id,
        "public_id": getattr(query, "public_id", None) or "",
        "title": title,
        "task_description": task_desc,
        "completed_examples": completed,
        "grant_info": grant_info,
        "budget": getattr(query, "budget", None),
        "deadline": deadline_str,
        "status": status_val,
        "organization_name": org.name if org else "",
        "organization_id": getattr(query, "organization_id", None),
        "organization_public_id": getattr(org, "public_id", None) if org else None,
        "organization_avatar_url": getattr(org, "avatar_url", None) if org else None,
        "laboratory_ids": laboratory_ids,
        "deadline_year": deadline_year,
        "is_published": getattr(query, "is_published", False),
        "created_at": created.isoformat() if created else None,
    }
    if title_inputs:
        doc["title_suggest"] = {"input": title_inputs, "weight": 2}
    if org and org.name:
        doc["organization_suggest"] = {"input": [org.name], "weight": 1}
    if status_val:
        doc["status_suggest"] = {"input": [status_val], "weight": 1}
    return doc


def _doc_to_query_item(doc: dict) -> dict:
    """Преобразовать документ ES в формат OrganizationQueryRead для API."""
    source = doc.get("_source", doc)
    org_id = source.get("organization_id")
    org_short = None
    if org_id is not None:
        org_short = {
            "id": org_id,
            "public_id": source.get("organization_public_id"),
            "name": source.get("organization_name", ""),
            "avatar_url": source.get("organization_avatar_url"),
        }
    return {
        "id": source.get("id"),
        "public_id": source.get("public_id"),
        "title": source.get("title", ""),
        "task_description": source.get("task_description"),
        "completed_examples": source.get("completed_examples"),
        "grant_info": source.get("grant_info"),
        "budget": source.get("budget"),
        "deadline": source.get("deadline"),
        "status": source.get("status"),
        "organization_id": org_id,
        "organization": org_short,
        "created_at": source.get("created_at"),
        "laboratories": [],
        "employees": [],
        "linked_task_solution": None,
        "vacancies": [],
    }


async def index_query(query: Any) -> None:
    """Проиндексировать запрос в Elasticsearch."""
    if not getattr(query, "is_published", False):
        return
    client = get_es_client()
    doc = _query_to_doc(query)
    last_err = None
    for attempt in range(3):
        try:
            await client.index(
                index=settings.QUERIES_INDEX,
                id=str(query.id),
                document=doc,
                request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
            )
            logger.debug("Indexed query id=%s", query.id)
            return
        except ConnectionTimeout as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.exception("Failed to index query id=%s: %s", query.id, e)
            return
    logger.warning("Failed to index query id=%s after retries: %s", query.id, last_err)


async def delete_query(query_id: int) -> None:
    """Удалить запрос из индекса."""
    client = get_es_client()
    try:
        await client.delete(index=settings.QUERIES_INDEX, id=str(query_id), ignore=[404])
        logger.debug("Deleted query id=%s from index", query_id)
    except Exception as e:
        logger.exception("Failed to delete query id=%s from index: %s", query_id, e)


async def suggest_queries(q: str = "", limit: int = 10) -> List[str]:
    """Подсказки для автодополнения поиска запросов (Completion Suggester)."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.QUERIES_INDEX
    suggest_body = {
        "title-suggest": {
            "prefix": q,
            "completion": {
                "field": "title_suggest",
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
        "status-suggest": {
            "prefix": q,
            "completion": {
                "field": "status_suggest",
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
        logger.exception("Elasticsearch queries suggest failed: %s", e)
        return []
    seen = set()
    result: List[str] = []
    for key in ("title-suggest", "org-suggest", "status-suggest"):
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


def _escape_wildcard(val: str) -> str:
    """Экранировать * и ? для wildcard-запроса Elasticsearch."""
    return (val or "").replace("\\", "\\\\").replace("*", "\\*").replace("?", "\\?")


async def search_queries(
    q: str = "",
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    laboratory_id: Optional[int] = None,
    deadline_year_from: Optional[int] = None,
    deadline_year_to: Optional[int] = None,
    budget_contains: Optional[str] = None,
) -> dict:
    """
    Поиск запросов по тексту и фильтрам.
    При пустом q — match_all (все опубликованные).
    Возвращает {items: [...], total: int, page: int, size: int}.
    """
    client = get_es_client()
    index = settings.QUERIES_INDEX
    q = (q or "").strip()
    from_idx = (page - 1) * size

    filters = [{"term": {"is_published": True}}]

    if status and status.strip():
        filters.append({"term": {"status.keyword": status.strip()}})
    if laboratory_id is not None:
        filters.append({"term": {"laboratory_ids": laboratory_id}})
    if deadline_year_from is not None or deadline_year_to is not None:
        range_clause: dict = {}
        if deadline_year_from is not None:
            range_clause["gte"] = deadline_year_from
        if deadline_year_to is not None:
            range_clause["lte"] = deadline_year_to
        if range_clause:
            filters.append({"range": {"deadline_year": range_clause}})
    if budget_contains and budget_contains.strip():
        escaped = _escape_wildcard(budget_contains.strip())
        filters.append({"wildcard": {"budget": f"*{escaped}*"}})

    if q:
        search_fields = [
            "title^2",
            "task_description",
            "completed_examples",
            "grant_info",
            "organization_name",
        ]
        es_query = {
            "bool": {
                "must": [
                    {"multi_match": {"query": q, "fields": search_fields, "type": "best_fields"}},
                ],
                "filter": filters,
            }
        }
    else:
        es_query = {"bool": {"must": [{"match_all": {}}], "filter": filters}}

    try:
        resp = await client.search(
            index=index,
            query=es_query,
            from_=from_idx,
            size=size,
            sort=[{"created_at": {"order": "desc"}}],
        )
    except NotFoundError:
        await reindex_queries_if_empty()
        try:
            resp = await client.search(
                index=index,
                query=es_query,
                from_=from_idx,
                size=size,
                sort=[{"created_at": {"order": "desc"}}],
            )
        except Exception as e:
            logger.exception("Elasticsearch queries search failed after index init: %s", e)
            return {"items": [], "total": 0, "page": page, "size": size}
    except Exception as e:
        logger.exception("Elasticsearch queries search failed: %s", e)
        return {"items": [], "total": 0, "page": page, "size": size}

    hits = resp.get("hits", {})
    total_val = hits.get("total")
    if isinstance(total_val, dict):
        total = total_val.get("value", 0)
    else:
        total = total_val or 0

    items = [_doc_to_query_item(h) for h in hits.get("hits", [])]
    return {"items": items, "total": total, "page": page, "size": size}


async def reindex_queries_if_empty() -> None:
    """Первичная индексация: если индекс пуст — загрузить все опубликованные запросы."""
    await reindex_queries(force=False)


async def reindex_queries(force: bool = False) -> int:
    """Переиндексация запросов из PostgreSQL в Elasticsearch."""
    await ensure_queries_index()
    count = await _queries_index_count()
    if not force and count > 0:
        logger.debug("Queries index already has %d documents, skipping reindex", count)
        return count
    from app.queries.async_orm import AsyncOrm
    queries = await AsyncOrm.list_published_queries()
    logger.info("Queries reindex: %d published queries", len(queries))
    indexed = 0
    for q in queries:
        try:
            await index_query(q)
            indexed += 1
        except Exception as e:
            logger.warning("Failed to index query id=%s: %s", q.id, e)
    logger.info("Reindex completed: %d queries indexed", indexed)
    return indexed
