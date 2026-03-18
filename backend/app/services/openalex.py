"""
Сервис для работы с OpenAlex API.
Авторы, работы, организации (institutions).
"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _api_url(path: str, params: Optional[dict] = None) -> tuple[str, dict]:
    """Build full URL and params with API key."""
    base = settings.OPENALEX_BASE_URL.rstrip("/")
    url = f"{base}{path}"
    query_params = dict(params) if params else {}
    if settings.OPENALEX_API_KEY:
        query_params["api_key"] = settings.OPENALEX_API_KEY
    return url, query_params


def _extract_openalex_id(openalex_url: str) -> str:
    """Extract short ID from https://openalex.org/A5023888391 -> A5023888391."""
    if not openalex_url:
        return ""
    return openalex_url.split("/")[-1] if "/" in openalex_url else openalex_url


def fetch_author_by_orcid(orcid: str) -> Optional[dict]:
    """GET /authors/https://orcid.org/{orcid}"""
    normalized = orcid.replace("https://orcid.org/", "").strip()
    path = f"/authors/https://orcid.org/{normalized}"
    url, params = _api_url(path)
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params)
        if resp.status_code != 200:
            return None
        return resp.json()


def fetch_author_by_id(openalex_id: str) -> Optional[dict]:
    """GET /authors/{id}"""
    clean_id = _extract_openalex_id(openalex_id)
    path = f"/authors/{clean_id}"
    url, params = _api_url(path)
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params)
        if resp.status_code != 200:
            logger.warning("OpenAlex fetch_author_by_id failed: openalex_id=%s status=%s", openalex_id, resp.status_code)
            return None
        return resp.json()


def fetch_author_works(openalex_id: str, per_page: int = 25) -> list[dict]:
    """GET /works?filter=author.id:{id}"""
    clean_id = _extract_openalex_id(openalex_id)
    path = "/works"
    params = {"filter": f"author.id:{clean_id}", "per-page": per_page}
    url, query_params = _api_url(path, params)
    query_params.update(params)
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=query_params)
        if resp.status_code != 200:
            logger.warning("OpenAlex fetch_author_works failed: openalex_id=%s status=%s", openalex_id, resp.status_code)
            return []
        data = resp.json()
        return data.get("results", [])


def map_author_to_researcher(author: dict, works: list[dict]) -> dict:
    """
    Map OpenAlex author + works to Researcher fields.
    - display_name -> full_name
    - summary_stats.h_index -> hindex_openalex
    - x_concepts[].display_name -> research_interests
    - affiliations -> education (format: "{institution.display_name} ({min(years)}–{max(years)})")
    - works -> publications (title, link=doi, source=primary_location.source.display_name)
    """
    result: dict = {
        "full_name": author.get("display_name", ""),
        "hindex_openalex": None,
        "research_interests": None,
        "education": None,
        "publications": None,
    }
    summary = author.get("summary_stats") or {}
    if "h_index" in summary:
        result["hindex_openalex"] = summary["h_index"]

    x_concepts = author.get("x_concepts") or []
    result["research_interests"] = [c.get("display_name") for c in x_concepts if c.get("display_name")]

    affiliations = author.get("affiliations") or []
    edu_items = []
    for aff in affiliations:
        inst = aff.get("institution") or {}
        years = aff.get("years") or []
        name = inst.get("display_name")
        if not name:
            continue
        if years:
            edu_items.append(f"{name} ({min(years)}–{max(years)})")
        else:
            edu_items.append(name)
    result["education"] = edu_items if edu_items else None

    pubs = []
    for w in works:
        title = w.get("title") or w.get("display_name") or ""
        link = w.get("doi")
        source = None
        pl = w.get("primary_location") or {}
        src = pl.get("source") or {}
        source = src.get("display_name")
        pubs.append({"title": title, "link": link, "source": source})
    result["publications"] = pubs if pubs else None

    return result


def fetch_institution_by_ror(ror_id: str) -> Optional[dict]:
    """GET /institutions/ror:{ror_id} or /institutions/https://ror.org/{ror_id}"""
    clean = ror_id.replace("https://ror.org/", "").strip()
    path = f"/institutions/ror:{clean}"
    url, params = _api_url(path)
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params)
        if resp.status_code != 200:
            logger.warning("OpenAlex fetch_institution_by_ror failed: ror_id=%s status=%s", ror_id, resp.status_code)
            return None
        return resp.json()


def map_institution_to_organization(institution: dict) -> dict:
    """
    Map OpenAlex institution to Organization fields.
    - display_name -> name
    - homepage_url -> website
    - geo (city, region, country) -> address
    - image_url -> avatar_url
    """
    result: dict = {
        "name": institution.get("display_name", ""),
        "website": institution.get("homepage_url"),
        "address": None,
        "avatar_url": institution.get("image_url"),
    }
    geo = institution.get("geo") or {}
    parts = []
    if geo.get("city"):
        parts.append(geo["city"])
    if geo.get("region"):
        parts.append(geo["region"])
    if geo.get("country"):
        parts.append(geo["country"])
    if parts:
        result["address"] = ", ".join(parts)
    return result
