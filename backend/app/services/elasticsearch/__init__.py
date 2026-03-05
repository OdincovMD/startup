"""
Пакет Elasticsearch: индексация и поиск вакансий, запросов, лабораторий, организаций.

Импорты для обратной совместимости:
    from app.services.elasticsearch import (
        search_vacancies, suggest_vacancies, index_vacancy, delete_vacancy,
        search_queries, suggest_queries, index_query, delete_query,
        search_laboratories, suggest_laboratories, index_laboratory, delete_laboratory,
        search_organizations, suggest_organizations, index_organization, delete_organization,
        reindex_*_by_ids, reindex_*_if_empty,
    )
"""

from .client import get_es_client
from .laboratories import (
    delete_laboratory,
    index_laboratory,
    reindex_laboratories_by_ids,
    reindex_laboratories_if_empty,
    search_laboratories,
    suggest_laboratories,
)
from .organizations import (
    delete_organization,
    index_organization,
    reindex_organizations_by_ids,
    reindex_organizations_if_empty,
    search_organizations,
    suggest_organizations,
)
from .queries import (
    delete_query,
    index_query,
    reindex_queries_if_empty,
    search_queries,
    suggest_queries,
)
from .vacancies import (
    delete_vacancy,
    index_vacancy,
    reindex_vacancies_if_empty,
    search_vacancies,
    suggest_vacancies,
)
from .global_search import suggest_global

__all__ = [
    "get_es_client",
    # Vacancies
    "search_vacancies",
    "suggest_vacancies",
    "index_vacancy",
    "delete_vacancy",
    "reindex_vacancies_if_empty",
    # Queries
    "search_queries",
    "suggest_queries",
    "index_query",
    "delete_query",
    "reindex_queries_if_empty",
    # Laboratories
    "search_laboratories",
    "suggest_laboratories",
    "index_laboratory",
    "delete_laboratory",
    "reindex_laboratories_by_ids",
    "reindex_laboratories_if_empty",
    # Organizations
    "search_organizations",
    "suggest_organizations",
    "index_organization",
    "delete_organization",
    "reindex_organizations_by_ids",
    "reindex_organizations_if_empty",
    "suggest_global",
]
