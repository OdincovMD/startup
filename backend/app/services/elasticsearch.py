"""
Сервис Elasticsearch для полнотекстового поиска.
Индексация и поиск вакансий.
"""

import asyncio
import logging
from typing import Any, Optional

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
        }
    }
}


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
    return {
        "id": vacancy.id,
        "public_id": getattr(vacancy, "public_id", None) or "",
        "name": getattr(vacancy, "name", None) or "",
        "requirements": getattr(vacancy, "requirements", None) or "",
        "description": getattr(vacancy, "description", None) or "",
        "employment_type": getattr(vacancy, "employment_type", None) or "",
        "organization_name": org.name if org else "",
        "laboratory_name": lab.name if lab else "",
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
