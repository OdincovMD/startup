"""
Индексация и поиск организаций в Elasticsearch.
"""

import asyncio
import logging
from typing import Any, List, Optional

from elasticsearch.exceptions import NotFoundError
from elastic_transport import ConnectionTimeout

from app.config import settings

from .client import get_es_client
from .mappings import ORGANIZATIONS_INDEX_MAPPING
from .utils import significant_words, sort_with_ranking

logger = logging.getLogger(__name__)


def _organization_to_doc(org: Any, org_analytics: Optional[dict] = None) -> dict:
    """Преобразовать ORM-организацию в документ для индекса."""
    name = getattr(org, "name", None) or ""
    description = getattr(org, "description", None) or ""
    ror_id = getattr(org, "ror_id", None) or ""
    created = getattr(org, "created_at", None)
    website = getattr(org, "website", None)
    address = getattr(org, "address", None)

    laboratory_names = []
    employee_names = []
    equipment_names = []

    for lab in getattr(org, "laboratories", None) or []:
        if getattr(lab, "is_published", False):
            lab_name = getattr(lab, "name", None)
            if lab_name:
                laboratory_names.append(lab_name)
            head = getattr(lab, "head_employee", None)
            if head and getattr(head, "full_name", None):
                employee_names.append(head.full_name)
            for emp in getattr(lab, "employees", None) or []:
                fn = getattr(emp, "full_name", None)
                if fn and fn not in employee_names:
                    employee_names.append(fn)
            for eq in getattr(lab, "equipment", None) or []:
                en = getattr(eq, "name", None)
                if en and en not in equipment_names:
                    equipment_names.append(en)

    for emp in getattr(org, "employees", None) or []:
        fn = getattr(emp, "full_name", None)
        if fn and fn not in employee_names:
            employee_names.append(fn)

    for eq in getattr(org, "equipment", None) or []:
        en = getattr(eq, "name", None)
        if en and en not in equipment_names:
            equipment_names.append(en)

    laboratories_count = len(laboratory_names)
    employees_count = len(employee_names)
    vacancies = getattr(org, "vacancies", None) or []
    queries = getattr(org, "queries", None) or []
    vacancies_count = sum(1 for v in vacancies if getattr(v, "is_published", False))
    queries_count = sum(1 for q in queries if getattr(q, "is_published", False))

    laboratory_names_str = " ".join(laboratory_names)
    employee_names_str = " ".join(employee_names)
    equipment_names_str = " ".join(equipment_names)

    name_inputs = [name] + significant_words(name) + significant_words(description)
    name_inputs = list(dict.fromkeys(s for s in name_inputs if s and len(s) <= 50))

    analytics = org_analytics or {}
    doc = {
        "id": org.id,
        "public_id": getattr(org, "public_id", None) or "",
        "name": name,
        "description": description,
        "ror_id": ror_id,
        "website": website,
        "address": address,
        "laboratory_names": laboratory_names_str,
        "employee_names": employee_names_str,
        "equipment_names": equipment_names_str,
        "laboratories_count": laboratories_count,
        "employees_count": employees_count,
        "vacancies_count": vacancies_count,
        "queries_count": queries_count,
        "avatar_url": getattr(org, "avatar_url", None),
        "is_published": getattr(org, "is_published", False),
        "created_at": created.isoformat() if created else None,
        "paid_active": False,
        "rank_score": 0.0,
        "creator_user_id": getattr(org, "creator_user_id", None),
        "unique_views_30d": analytics.get("unique_views_30d", 0),
        "avg_time_on_page_sec": analytics.get("avg_time_on_page_sec"),
    }
    from .utils import calc_organization_score
    doc["rank_score"] = calc_organization_score(doc)
    if name_inputs:
        doc["name_suggest"] = {"input": name_inputs, "weight": 2}
    if laboratory_names:
        doc["laboratory_suggest"] = {"input": list(dict.fromkeys(laboratory_names)), "weight": 1}
    if employee_names:
        doc["employee_suggest"] = {"input": list(dict.fromkeys(employee_names)), "weight": 1}
    if equipment_names:
        doc["equipment_suggest"] = {"input": list(dict.fromkeys(equipment_names)), "weight": 1}
    if ror_id:
        doc["ror_suggest"] = {"input": [ror_id], "weight": 1}
    pid = getattr(org, "public_id", None)
    if pid:
        doc["public_id_suggest"] = {"input": [pid], "weight": 2}
    return doc


async def ensure_organizations_index() -> None:
    """Создать индекс организаций, если не существует."""
    client = get_es_client()
    index = settings.ORGANIZATIONS_INDEX
    try:
        exists = await client.indices.exists(index=index)
        if not exists:
            await client.indices.create(index=index, body=ORGANIZATIONS_INDEX_MAPPING)
            logger.info("Created Elasticsearch index: %s", index)
        else:
            await client.indices.put_settings(index=index, body={"number_of_replicas": 0})
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
        logger.warning("Could not ensure organizations index: %s", e)


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


async def index_organization(
    org: Any,
    paid_user_ids: set = None,
    org_analytics: Optional[dict] = None,
) -> None:
    """Проиндексировать организацию в Elasticsearch."""
    if not getattr(org, "is_published", False):
        return
    client = get_es_client()
    doc = _organization_to_doc(org, org_analytics=org_analytics)
    await _resolve_paid_active(doc, paid_user_ids)
    last_err = None
    for attempt in range(3):
        try:
            await client.index(
                index=settings.ORGANIZATIONS_INDEX,
                id=str(org.id),
                document=doc,
                request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
            )
            logger.debug("Indexed organization id=%s", org.id)
            return
        except ConnectionTimeout as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.exception("Failed to index organization id=%s: %s", org.id, e)
            return
    logger.warning("Failed to index organization id=%s after retries: %s", org.id, last_err)


async def delete_organization(organization_id: int) -> None:
    """Удалить организацию из индекса."""
    client = get_es_client()
    try:
        await client.delete(
            index=settings.ORGANIZATIONS_INDEX, id=str(organization_id), ignore=[404]
        )
        logger.debug("Deleted organization id=%s from index", organization_id)
    except Exception as e:
        logger.exception(
            "Failed to delete organization id=%s from index: %s", organization_id, e
        )


def _doc_to_organization_item(doc: dict) -> dict:
    """Преобразовать документ ES в формат OrganizationRead для API."""
    source = doc.get("_source", doc)
    return {
        "id": source.get("id"),
        "public_id": source.get("public_id"),
        "name": source.get("name", ""),
        "description": source.get("description"),
        "avatar_url": source.get("avatar_url"),
        "address": None,
        "website": None,
        "ror_id": source.get("ror_id"),
        "created_at": source.get("created_at"),
    }


async def suggest_organizations(q: str = "", limit: int = 10) -> List[str]:
    """Подсказки для автодополнения поиска организаций (Completion Suggester)."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.ORGANIZATIONS_INDEX
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
        "laboratory-suggest": {
            "prefix": q,
            "completion": {
                "field": "laboratory_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "employee-suggest": {
            "prefix": q,
            "completion": {
                "field": "employee_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "equipment-suggest": {
            "prefix": q,
            "completion": {
                "field": "equipment_suggest",
                "size": limit,
                "skip_duplicates": True,
                "fuzzy": {"fuzziness": "AUTO"},
            },
        },
        "ror-suggest": {
            "prefix": q,
            "completion": {
                "field": "ror_suggest",
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
        logger.exception("Elasticsearch organizations suggest failed: %s", e)
        return []
    seen = set()
    result: List[str] = []
    for key in (
        "name-suggest",
        "laboratory-suggest",
        "employee-suggest",
        "equipment-suggest",
        "ror-suggest",
        "public_id-suggest",
    ):
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


async def _suggest_organizations_with_source(
    q: str = "", limit: int = 10
) -> List[dict]:
    """Подсказки с public_id и title для глобального поиска. Возвращает [{text, public_id, title}]."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.ORGANIZATIONS_INDEX
    comp = {"size": limit, "skip_duplicates": True, "fuzzy": {"fuzziness": "AUTO"}}
    suggest_body = {
        "name-suggest": {"prefix": q, "completion": {**comp, "field": "name_suggest"}},
        "laboratory-suggest": {"prefix": q, "completion": {**comp, "field": "laboratory_suggest"}},
        "employee-suggest": {"prefix": q, "completion": {**comp, "field": "employee_suggest"}},
        "equipment-suggest": {"prefix": q, "completion": {**comp, "field": "equipment_suggest"}},
        "ror-suggest": {"prefix": q, "completion": {**comp, "field": "ror_suggest"}},
        "public_id-suggest": {"prefix": q, "completion": {**comp, "field": "public_id_suggest"}},
    }
    body = {"suggest": suggest_body, "size": 0, "_source": ["public_id", "name"]}
    try:
        resp = await client.search(index=index, body=body)
    except NotFoundError:
        return []
    except Exception as e:
        logger.exception("Elasticsearch organizations suggest failed: %s", e)
        return []
    seen: set = set()
    result: List[dict] = []
    for key in ("name-suggest", "laboratory-suggest", "employee-suggest", "equipment-suggest", "ror-suggest", "public_id-suggest"):
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


async def search_organizations(
    q: str = "",
    page: int = 1,
    size: int = 20,
    min_laboratories: Optional[int] = None,
    min_employees: Optional[int] = None,
    sort_by: Optional[str] = None,
) -> dict:
    """
    Поиск организаций по запросу и фильтрам.
    При пустом q — match_all (все опубликованные с учётом фильтров).
    Возвращает {items: [...], total: int, page: int, size: int}.
    """
    client = get_es_client()
    index = settings.ORGANIZATIONS_INDEX
    q = (q or "").strip()
    from_idx = (page - 1) * size

    filters = [{"term": {"is_published": True}}]
    if min_laboratories is not None and min_laboratories > 0:
        filters.append({"range": {"laboratories_count": {"gte": min_laboratories}}})
    if min_employees is not None and min_employees > 0:
        filters.append({"range": {"employees_count": {"gte": min_employees}}})

    if q:
        search_fields = [
            "name^2",
            "description",
            "ror_id",
            "laboratory_names",
            "employee_names",
            "equipment_names",
            "public_id",
        ]
        base_query = {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": q,
                            "fields": search_fields,
                            "type": "best_fields",
                            "fuzziness": "AUTO",
                        }
                    }
                ],
                "filter": filters,
            }
        }
        es_query = {
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
        await ensure_organizations_index()
        try:
            resp = await client.search(
                index=index,
                query=es_query,
                from_=from_idx,
                size=size,
                sort=sort_clause,
            )
        except Exception as e:
            logger.exception(
                "Elasticsearch organizations search failed after index init: %s", e
            )
            return {"items": [], "total": 0, "page": page, "size": size}
    except Exception as e:
        logger.exception("Elasticsearch organizations search failed: %s", e)
        return {"items": [], "total": 0, "page": page, "size": size}

    hits = resp.get("hits", {})
    total_val = hits.get("total")
    if isinstance(total_val, dict):
        total = total_val.get("value", 0)
    else:
        total = total_val or 0

    items = [_doc_to_organization_item(h) for h in hits.get("hits", [])]
    return {"items": items, "total": total, "page": page, "size": size}


async def get_organizations_ranking_for_featured(size: int = 30) -> list[dict]:
    """
    Возвращает список {id, rank_score, paid_active} для главной страницы.
    Сортировка: paid_active DESC, rank_score DESC.
    """
    client = get_es_client()
    index = settings.ORGANIZATIONS_INDEX
    filters = [{"term": {"is_published": True}}]
    es_query = {"bool": {"must": [{"match_all": {}}], "filter": filters}}
    sort_clause = sort_with_ranking(None)
    try:
        resp = await client.search(
            index=index,
            query=es_query,
            from_=0,
            size=size,
            sort=sort_clause,
        )
    except NotFoundError:
        await ensure_organizations_index()
        try:
            resp = await client.search(
                index=index,
                query=es_query,
                from_=0,
                size=size,
                sort=sort_clause,
            )
        except Exception as e:
            logger.exception("get_organizations_ranking_for_featured failed: %s", e)
            return []
    except Exception as e:
        logger.exception("get_organizations_ranking_for_featured failed: %s", e)
        return []

    result = []
    for h in resp.get("hits", {}).get("hits", []):
        source = h.get("_source", h)
        oid = source.get("id")
        if oid is not None:
            result.append({
                "id": oid,
                "rank_score": float(source.get("rank_score") or 0),
                "paid_active": bool(source.get("paid_active", False)),
            })
    return result


async def reindex_organizations_by_ids(org_ids: List[int]) -> None:
    """
    Переиндексировать указанные организации (при изменении лабораторий/сотрудников/оборудования).
    Индексируются только опубликованные организации.
    """
    if not org_ids:
        return
    from app.roles.representative.queries.orm import Orm

    orgs = await Orm.get_organizations_by_ids(org_ids)
    creator_ids = [o.creator_user_id for o in orgs if o.creator_user_id]
    from app.core.queries.orm import Orm as CoreOrm
    paid_ids = await CoreOrm.get_paid_user_ids(creator_ids)
    public_ids = [o.public_id for o in orgs if o.public_id]
    org_analytics_map = await Orm.get_organization_analytics_30d(public_ids)
    for org in orgs:
        try:
            analytics = org_analytics_map.get(org.public_id, {}) if org.public_id else {}
            await index_organization(org, paid_user_ids=paid_ids, org_analytics=analytics)
        except Exception as e:
            logger.warning("Failed to reindex organization id=%s: %s", org.id, e)


async def reindex_organizations_if_empty() -> None:
    """
    Первичная индексация: если индекс организаций пуст — загрузить все
    опубликованные организации из PostgreSQL. Вызывается при старте приложения.
    """
    await reindex_organizations(force=False)


async def reindex_organizations(force: bool = False) -> int:
    """
    Переиндексация организаций из PostgreSQL в Elasticsearch.
    force=True — всегда переиндексировать; force=False — только если индекс пуст.
    """
    await ensure_organizations_index()
    from app.roles.representative.queries.orm import Orm

    orgs = await Orm.list_published_organizations()
    if not force and orgs:
        client = get_es_client()
        try:
            count_resp = await client.count(index=settings.ORGANIZATIONS_INDEX)
            count = count_resp.get("count", 0)
            if count > 0:
                logger.debug(
                    "Organizations index already has %d documents, skipping reindex",
                    count,
                )
                return count
        except Exception:
            pass
    creator_ids = [o.creator_user_id for o in orgs if o.creator_user_id]
    from app.core.queries.orm import Orm as CoreOrm
    paid_ids = await CoreOrm.get_paid_user_ids(creator_ids)
    public_ids = [o.public_id for o in orgs if o.public_id]
    org_analytics_map = await Orm.get_organization_analytics_30d(public_ids)
    logger.info("Organizations reindex: %d published organizations", len(orgs))
    indexed = 0
    for org in orgs:
        try:
            org_with_relations = await Orm.get_organizations_by_ids([org.id])
            if org_with_relations:
                analytics = org_analytics_map.get(org.public_id, {}) if org.public_id else {}
                await index_organization(
                    org_with_relations[0],
                    paid_user_ids=paid_ids,
                    org_analytics=analytics,
                )
                indexed += 1
        except Exception as e:
            logger.warning("Failed to index organization id=%s: %s", org.id, e)
    logger.info("Reindex completed: %d organizations indexed", indexed)
    return indexed
