"""
Индексация и поиск лабораторий в Elasticsearch.
"""

import asyncio
import logging
from typing import Any, List, Optional

from elasticsearch.exceptions import NotFoundError
from elastic_transport import ConnectionTimeout

from app.config import settings

from .client import get_es_client
from .mappings import LABORATORIES_INDEX_MAPPING
from .utils import significant_words, sort_by_date

logger = logging.getLogger(__name__)


async def ensure_laboratories_index() -> None:
    """Создать индекс лабораторий, если не существует. Маппинг — только при создании."""
    client = get_es_client()
    index = settings.LABORATORIES_INDEX
    try:
        exists = await client.indices.exists(index=index)
        if not exists:
            await client.indices.create(index=index, body=LABORATORIES_INDEX_MAPPING)
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
        logger.warning("Could not ensure laboratories index: %s", e)


def _laboratory_to_doc(lab: Any) -> dict:
    """Преобразовать ORM-лабораторию в документ для индекса."""
    org = getattr(lab, "organization", None)
    created = getattr(lab, "created_at", None)
    name = getattr(lab, "name", None) or ""
    description = getattr(lab, "description", None) or ""
    activities = getattr(lab, "activities", None) or ""

    employee_names = []
    head = getattr(lab, "head_employee", None)
    if head and getattr(head, "full_name", None):
        employee_names.append(head.full_name)
    for emp in getattr(lab, "employees", None) or []:
        fn = getattr(emp, "full_name", None)
        if fn and fn not in employee_names:
            employee_names.append(fn)
    employee_names_str = " ".join(employee_names)

    equipment_names = []
    equipment_descriptions = []
    for eq in getattr(lab, "equipment", None) or []:
        en = getattr(eq, "name", None)
        if en:
            equipment_names.append(en)
        ed = getattr(eq, "description", None) or ""
        if ed:
            equipment_descriptions.append(ed)
    equipment_names_str = " ".join(equipment_names)
    equipment_descriptions_str = " ".join(equipment_descriptions)

    employees_count = len(getattr(lab, "employees", None) or [])

    name_inputs = [name] + significant_words(name) + significant_words(description) + significant_words(activities)
    name_inputs = list(dict.fromkeys(s for s in name_inputs if s and len(s) <= 50))

    doc = {
        "id": lab.id,
        "public_id": getattr(lab, "public_id", None) or "",
        "name": name,
        "description": description,
        "activities": activities,
        "organization_name": org.name if org else "",
        "organization_id": getattr(lab, "organization_id", None),
        "organization_public_id": getattr(org, "public_id", None) if org else None,
        "organization_avatar_url": getattr(org, "avatar_url", None) if org else None,
        "employee_names": employee_names_str,
        "equipment_names": equipment_names_str,
        "equipment_descriptions": equipment_descriptions_str,
        "employees_count": employees_count,
        "has_organization": org is not None,
        "is_published": getattr(lab, "is_published", False),
        "created_at": created.isoformat() if created else None,
    }
    if name_inputs:
        doc["name_suggest"] = {"input": name_inputs, "weight": 2}
    if org and org.name:
        doc["organization_suggest"] = {"input": [org.name], "weight": 1}
    if employee_names:
        doc["employee_suggest"] = {"input": list(dict.fromkeys(employee_names)), "weight": 1}
    if equipment_names:
        doc["equipment_suggest"] = {"input": list(dict.fromkeys(equipment_names)), "weight": 1}
    pid = getattr(lab, "public_id", None)
    if pid:
        doc["public_id_suggest"] = {"input": [pid], "weight": 2}
    return doc


def _doc_to_laboratory_item(doc: dict) -> dict:
    """Преобразовать документ ES в формат OrganizationLaboratoryRead для API."""
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
        "name": source.get("name", ""),
        "description": source.get("description"),
        "activities": source.get("activities"),
        "image_urls": [],
        "created_at": source.get("created_at"),
        "organization": org_short,
        "head_employee": None,
        "employees": [],
        "researchers": [],
        "equipment": [],
        "task_solutions": [],
    }


async def index_laboratory(lab: Any) -> None:
    """Проиндексировать лабораторию в Elasticsearch."""
    if not getattr(lab, "is_published", False):
        return
    client = get_es_client()
    doc = _laboratory_to_doc(lab)
    last_err = None
    for attempt in range(3):
        try:
            await client.index(
                index=settings.LABORATORIES_INDEX,
                id=str(lab.id),
                document=doc,
                request_timeout=settings.ELASTICSEARCH_REQUEST_TIMEOUT,
            )
            logger.debug("Indexed laboratory id=%s", lab.id)
            return
        except ConnectionTimeout as e:
            last_err = e
            if attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.exception("Failed to index laboratory id=%s: %s", lab.id, e)
            return
    logger.warning("Failed to index laboratory id=%s after retries: %s", lab.id, last_err)


async def delete_laboratory(laboratory_id: int) -> None:
    """Удалить лабораторию из индекса."""
    client = get_es_client()
    try:
        await client.delete(
            index=settings.LABORATORIES_INDEX, id=str(laboratory_id), ignore=[404]
        )
        logger.debug("Deleted laboratory id=%s from index", laboratory_id)
    except Exception as e:
        logger.exception("Failed to delete laboratory id=%s from index: %s", laboratory_id, e)


async def suggest_laboratories(q: str = "", limit: int = 10) -> List[str]:
    """Подсказки для автодополнения поиска лабораторий (Completion Suggester)."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.LABORATORIES_INDEX
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
        logger.exception("Elasticsearch laboratories suggest failed: %s", e)
        return []
    seen = set()
    result: List[str] = []
    for key in ("name-suggest", "org-suggest", "employee-suggest", "equipment-suggest", "public_id-suggest"):
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


async def _suggest_laboratories_with_source(
    q: str = "", limit: int = 10
) -> List[dict]:
    """Подсказки с public_id и title для глобального поиска. Возвращает [{text, public_id, title}]."""
    q = (q or "").strip()
    if len(q) < 2:
        return []
    client = get_es_client()
    index = settings.LABORATORIES_INDEX
    comp = {"size": limit, "skip_duplicates": True, "fuzzy": {"fuzziness": "AUTO"}}
    suggest_body = {
        "name-suggest": {"prefix": q, "completion": {**comp, "field": "name_suggest"}},
        "org-suggest": {"prefix": q, "completion": {**comp, "field": "organization_suggest"}},
        "employee-suggest": {"prefix": q, "completion": {**comp, "field": "employee_suggest"}},
        "equipment-suggest": {"prefix": q, "completion": {**comp, "field": "equipment_suggest"}},
        "public_id-suggest": {"prefix": q, "completion": {**comp, "field": "public_id_suggest"}},
    }
    body = {"suggest": suggest_body, "size": 0, "_source": ["public_id", "name"]}
    try:
        resp = await client.search(index=index, body=body)
    except NotFoundError:
        return []
    except Exception as e:
        logger.exception("Elasticsearch laboratories suggest failed: %s", e)
        return []
    seen: set = set()
    result: List[dict] = []
    for key in ("name-suggest", "org-suggest", "employee-suggest", "equipment-suggest", "public_id-suggest"):
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


async def search_laboratories(
    q: str = "",
    page: int = 1,
    size: int = 20,
    organization_id: Optional[int] = None,
    without_org: bool = False,
    min_employees: Optional[int] = None,
    sort_by: Optional[str] = None,
) -> dict:
    """
    Поиск лабораторий по запросу и фильтрам.
    При пустом q — match_all (все опубликованные с учётом фильтров).
    Возвращает {items: [...], total: int, page: int, size: int}.
    """
    client = get_es_client()
    index = settings.LABORATORIES_INDEX
    q = (q or "").strip()
    from_idx = (page - 1) * size

    filters = [{"term": {"is_published": True}}]
    if organization_id is not None:
        filters.append({"term": {"organization_id": organization_id}})
    if without_org:
        filters.append({"term": {"has_organization": False}})
    if min_employees is not None and min_employees > 0:
        filters.append({"range": {"employees_count": {"gte": min_employees}}})

    if q:
        search_fields = [
            "name^2",
            "description",
            "activities",
            "organization_name",
            "employee_names",
            "equipment_names",
            "equipment_descriptions",
            "public_id",
        ]
        es_query = {
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
    else:
        es_query = {"bool": {"must": [{"match_all": {}}], "filter": filters}}

    sort_clause = sort_by_date(sort_by)
    try:
        resp = await client.search(
            index=index,
            query=es_query,
            from_=from_idx,
            size=size,
            sort=sort_clause,
        )
    except NotFoundError:
        await ensure_laboratories_index()
        try:
            resp = await client.search(
                index=index,
                query=es_query,
                from_=from_idx,
                size=size,
                sort=sort_clause,
            )
        except Exception as e:
            logger.exception("Elasticsearch laboratories search failed after index init: %s", e)
            return {"items": [], "total": 0, "page": page, "size": size}
    except Exception as e:
        logger.exception("Elasticsearch laboratories search failed: %s", e)
        return {"items": [], "total": 0, "page": page, "size": size}

    hits = resp.get("hits", {})
    total_val = hits.get("total")
    if isinstance(total_val, dict):
        total = total_val.get("value", 0)
    else:
        total = total_val or 0

    items = [_doc_to_laboratory_item(h) for h in hits.get("hits", [])]
    return {"items": items, "total": total, "page": page, "size": size}


async def reindex_laboratories_by_ids(lab_ids: List[int]) -> None:
    """
    Переиндексировать указанные лаборатории (при изменении оборудования/сотрудников).
    Индексируются только опубликованные лаборатории.
    """
    if not lab_ids:
        return
    from app.roles.representative.queries.orm import Orm

    labs = await Orm.get_laboratories_by_ids(lab_ids)
    for lab in labs:
        try:
            await index_laboratory(lab)
        except Exception as e:
            logger.warning("Failed to reindex laboratory id=%s: %s", lab.id, e)


async def reindex_laboratories_if_empty() -> None:
    """
    Первичная индексация: если индекс лабораторий пуст — загрузить все
    опубликованные лаборатории из PostgreSQL. Вызывается при старте приложения.
    """
    await reindex_laboratories(force=False)


async def reindex_laboratories(force: bool = False) -> int:
    """
    Переиндексация лабораторий из PostgreSQL в Elasticsearch.
    force=True — всегда переиндексировать; force=False — только если индекс пуст.
    """
    await ensure_laboratories_index()
    from app.roles.representative.queries.orm import Orm

    labs = await Orm.list_published_laboratories()
    if not force and labs:
        client = get_es_client()
        try:
            count_resp = await client.count(index=settings.LABORATORIES_INDEX)
            count = count_resp.get("count", 0)
            if count > 0:
                logger.debug("Laboratories index already has %d documents, skipping reindex", count)
                return count
        except Exception:
            pass
    logger.info("Laboratories reindex: %d published laboratories", len(labs))
    indexed = 0
    for lab in labs:
        try:
            await index_laboratory(lab)
            indexed += 1
        except Exception as e:
            logger.warning("Failed to index laboratory id=%s: %s", lab.id, e)
    logger.info("Reindex completed: %d laboratories indexed", indexed)
    return indexed
