"""
Elasticsearch async client (singleton).
"""

from typing import Optional

from elasticsearch import AsyncElasticsearch

from app.config import settings

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
