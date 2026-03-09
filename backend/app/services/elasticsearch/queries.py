"""
Индексация и поиск запросов организаций в Elasticsearch.
"""

import asyncio
import logging
import re
from typing import Any, List, Optional

from elasticsearch.exceptions import NotFoundError
from elastic_transport import ConnectionTimeout
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import models
from app.config import settings
from app.database import async_session_factory

from .client import get_es_client
from .mappings import QUERIES_INDEX_MAPPING
from .utils import escape_wildcard, significant_words, sort_with_ranking

logger = logging.getLogger(__name__)


async def _load_query_for_indexing(query_id: int):
    """Загрузить запрос с organization и laboratories. Возвращает query или None."""
    async with async_session_factory() as session:
        stmt = (
            select(models.OrganizationQuery)
            .options(
                selectinload(models.OrganizationQuery.organization),
                selectinload(models.OrganizationQuery.laboratories),
            )
            .where(models.OrganizationQuery.id == query_id)
        )
        result = await session.execute(stmt)
        query = result.scalars().first()
        if not query or not getattr(query, "is_published", False):
            return None
        return query


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
            new_props = {
                "properties": {
                    "laboratory_ids": {"type": "integer"},
                    "deadline_year": {"type": "integer"},
                    "public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
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


def _query_to_doc(query: Any, query_analytics: Optional[dict] = None) -> dict:
    """Преобразовать ORM-запрос в документ для индекса."""
    org = getattr(query, "organization", None)
    created = getattr(query, "created_at", None)
    first_created = getattr(query, "first_created_at", None) or created
    title = getattr(query, "title", None) or ""
    task_desc = getattr(query, "task_description", None) or ""
    completed = getattr(query, "completed_examples", None) or ""
    grant_info = getattr(query, "grant_info", None) or ""
    status_val = getattr(query, "status", None) or ""

    title_inputs = [title] + significant_words(title)
    for t in [task_desc, completed, grant_info]:
        title_inputs.extend(significant_words(t))
    title_inputs = list(dict.fromkeys(s for s in title_inputs if s and len(s) <= 50))

    laboratories = getattr(query, "laboratories", None) or []
    laboratory_ids = [lab.id for lab in laboratories if getattr(lab, "id", None) is not None]

    deadline_str = getattr(query, "deadline", None) or ""
    deadline_year = None
    if deadline_str:
        year_match = re.search(r"\b(19|20)\d{2}\b", deadline_str)
        if year_match:
            deadline_year = int(year_match.group(0))

    analytics = query_analytics or {}
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
        "first_created_at": first_created.isoformat() if first_created else None,
        "paid_active": False,
        "rank_score": 0.0,
        "creator_user_id": getattr(query, "creator_user_id", None),
        "unique_views_30d": analytics.get("unique_views_30d", 0),
        "avg_time_on_page_sec": analytics.get("avg_time_on_page_sec"),
    }
    from .utils import calc_query_score
    doc["rank_score"] = calc_query_score(doc)
    if title_inputs:
        doc["title_suggest"] = {"input": title_inputs, "weight": 2}
    if org and org.name:
        doc["organization_suggest"] = {"input": [org.name], "weight": 1}
    if status_val:
        doc["status_suggest"] = {"input": [status_val], "weight": 1}
    pid = getattr(query, "public_id", None)
    if pid:
        doc["public_id_suggest"] = {"input": [pid], "weight": 2}
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


async def _resolve_paid_active(doc: dict, paid_user_ids: set = None) -> None:
    """Set paid_active on doc based on creator's subscription or grace period."""
    creator_id = doc.get("creator_user_id")
    if creator_id is None:
        return
    if paid_user_ids is not None:
        paid = creator_id in paid_user_ids
    else:
        from app.core.queries.orm import Orm as CoreOrm
        paid = await CoreOrm.has_active_subscription(creator_id)
        if not paid and await CoreOrm.is_creator_in_grace_period(creator_id):
            paid = True
    doc["paid_active"] = paid


async def index_query(
    query_id: int,
    paid_user_ids: set = None,
    query_analytics: Optional[dict] = None,
) -> None:
    """Проиндексировать запрос в Elasticsearch (загружает запрос с organization/laboratories в своей сессии)."""
    query = await _load_query_for_indexing(query_id)
    if query is None:
        return
    doc = _query_to_doc(query, query_analytics=query_analytics)
    await _resolve_paid_active(doc, paid_user_ids)
    client = get_es_client()
    last_err = None
    for attempt in range(3):
        try:
            await client.index(
                index=settings.QUERIES_INDEX,
                id=str(query_id),
                document=doc,
                request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
            )
            logger.debug("Indexed query id=%s", query_id)
            return
        except ConnectionTimeout as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.exception("Failed to index query id=%s: %s", query_id, e)
            return
    logger.warning("Failed to index query id=%s after retries: %s", query_id, last_err)


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
        logger.exception("Elasticsearch queries suggest failed: %s", e)
        return []
    seen = set()
    result: List[str] = []
    for key in ("title-suggest", "org-suggest", "status-suggest", "public_id-suggest"):
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


async def _suggest_queries_with_source(
    q: str = "", limit: int = 10
) -> List[dict]:
    """Подсказки с public_id и title для глобального поиска. Возвращает [{text, public_id, title}]."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.QUERIES_INDEX
    comp = {"size": limit, "skip_duplicates": True, "fuzzy": {"fuzziness": "AUTO"}}
    suggest_body = {
        "title-suggest": {"prefix": q, "completion": {**comp, "field": "title_suggest"}},
        "org-suggest": {"prefix": q, "completion": {**comp, "field": "organization_suggest"}},
        "status-suggest": {"prefix": q, "completion": {**comp, "field": "status_suggest"}},
        "public_id-suggest": {"prefix": q, "completion": {**comp, "field": "public_id_suggest"}},
    }
    body = {"suggest": suggest_body, "size": 0, "_source": ["public_id", "title"]}
    try:
        resp = await client.search(index=index, body=body)
    except NotFoundError:
        return []
    except Exception as e:
        logger.exception("Elasticsearch queries suggest failed: %s", e)
        return []
    seen: set = set()
    result: List[dict] = []
    for key in ("title-suggest", "org-suggest", "status-suggest", "public_id-suggest"):
        suggest_data = resp.get("suggest", {}).get(key, [])
        for opt in suggest_data:
            for item in opt.get("options", []):
                text = item.get("text")
                source = item.get("_source", {})
                public_id = source.get("public_id") or ""
                title = source.get("title") or source.get("name") or text or ""
                if text and public_id and (public_id, text) not in seen:
                    seen.add((public_id, text))
                    result.append({"text": text, "public_id": public_id, "title": title})
                    if len(result) >= limit:
                        return result[:limit]
    return result[:limit]


async def search_queries(
    q: str = "",
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    laboratory_id: Optional[int] = None,
    budget_contains: Optional[str] = None,
    sort_by: Optional[str] = None,
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
    if budget_contains and budget_contains.strip():
        escaped = escape_wildcard(budget_contains.strip())
        filters.append({"wildcard": {"budget": f"*{escaped}*"}})

    if q:
        search_fields = [
            "title^2",
            "task_description",
            "completed_examples",
            "grant_info",
            "organization_name",
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
        ref_score = settings.ES_RELEVANCE_REF_SCORE
        es_query = {
            "function_score": {
                "query": base_query,
                "functions": [
                    {
                        "script_score": {
                            "script": {
                                "source": "double r = doc['rank_score'].size() > 0 ? doc['rank_score'].value : 0.0; return r + Math.min(35.0, 35.0 * _score / params.ref);",
                                "params": {"ref": ref_score},
                                "lang": "painless",
                            }
                        }
                    },
                    {
                        "script_score": {
                            "script": {
                                "source": "if (doc['paid_active'].size() > 0 && doc['paid_active'].value) { double rs = doc['rank_score'].size() > 0 ? doc['rank_score'].value : 0.0; return 1.0 + (rs / 100.0) * 1.5; } return 1.0;",
                                "lang": "painless",
                            }
                        }
                    },
                ],
                "score_mode": "multiply",
                "boost_mode": "replace",
            }
        }
        sort_clause = sort_with_ranking(sort_by, use_query_score=True)
    else:
        es_query = {"bool": {"must": [{"match_all": {}}], "filter": filters}}
        sort_clause = sort_with_ranking(sort_by)
    try:
        resp = await client.search(
            index=index,
            query=es_query,
            from_=from_idx,
            size=size,
            sort=sort_clause,
        )
    except NotFoundError:
        await reindex_queries_if_empty()
        try:
            resp = await client.search(
                index=index,
                query=es_query,
                from_=from_idx,
                size=size,
                sort=sort_clause,
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
    from app.queries.orm import Orm
    queries = await Orm.list_published_queries()
    creator_ids = [q.creator_user_id for q in queries if q.creator_user_id]
    from app.core.queries.orm import Orm as CoreOrm
    paid_ids = await CoreOrm.get_paid_user_ids(creator_ids)
    public_ids = [q.public_id for q in queries if q.public_id]
    query_analytics_map = await Orm.get_query_analytics_30d(public_ids)
    logger.info("Queries reindex: %d published queries", len(queries))
    indexed = 0
    for q in queries:
        try:
            analytics = query_analytics_map.get(q.public_id, {}) if q.public_id else {}
            await index_query(q.id, paid_user_ids=paid_ids, query_analytics=analytics)
            indexed += 1
        except Exception as e:
            logger.warning("Failed to index query id=%s: %s", q.id, e)
    logger.info("Reindex completed: %d queries indexed", indexed)
    return indexed
