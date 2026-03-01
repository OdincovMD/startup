"""
API для привязки и импорта данных OpenAlex (профиль пользователя).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
from app.queries.async_orm import AsyncOrm
from app.services.openalex import (
    fetch_author_by_id,
    fetch_author_by_orcid,
    fetch_author_works,
    map_author_to_researcher,
)

router = APIRouter(prefix="/openalex", tags=["profile-openalex"])


class LinkOpenAlexBody(BaseModel):
    openalex_id: str


def _extract_openalex_id(val: str) -> str:
    """Extract short ID from URL or raw ID."""
    val = val.strip()
    if "openalex.org/" in val:
        return val.split("/")[-1]
    return val


def _is_researcher(user) -> bool:
    return user.role is not None and user.role.name == "researcher"


@router.post("/link")
async def link_openalex(
    body: LinkOpenAlexBody,
    current_user=Depends(get_current_user),
):
    """Привязать OpenAlex ID. Проверка через API, сохранение в users.openalex_id."""
    openalex_id = _extract_openalex_id(body.openalex_id)
    if not openalex_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный OpenAlex ID")
    author = fetch_author_by_id(openalex_id)
    if not author:
        logger.warning("OpenAlex link failed: author not found openalex_id=%s", openalex_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Автор не найден в OpenAlex. Проверьте ID.",
        )
    await AsyncOrm.update_user_openalex(current_user.id, openalex_id)
    logger.info("OpenAlex linked: user_id=%s openalex_id=%s", current_user.id, openalex_id)
    if _is_researcher(current_user):
        works = fetch_author_works(openalex_id, per_page=25)
        mapped = map_author_to_researcher(author, works)
        await AsyncOrm.upsert_researcher_profile(
            current_user.id,
            full_name=mapped.get("full_name"),
            research_interests=mapped.get("research_interests"),
            education=mapped.get("education"),
            publications=mapped.get("publications"),
            hindex_openalex=mapped.get("hindex_openalex"),
        )
    return {"openalex_id": openalex_id, "display_name": author.get("display_name")}


@router.delete("/unlink")
async def unlink_openalex(current_user=Depends(get_current_user)):
    """Отвязать OpenAlex ID."""
    await AsyncOrm.update_user_openalex(current_user.id, None)
    logger.info("OpenAlex unlinked: user_id=%s", current_user.id)
    return {"ok": True}


@router.post("/import")
async def import_openalex(current_user=Depends(get_current_user)):
    """
    Импорт/обновление данных: по user.openalex_id или user.orcid получить автора,
    загрузить works, обновить Researcher. Только для роли researcher.
    """
    if not _is_researcher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Импорт доступен только для роли исследователя",
        )
    user = await AsyncOrm.get_user(current_user.id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    author = None
    openalex_id = user.openalex_id

    if openalex_id:
        author = fetch_author_by_id(openalex_id)
    elif user.orcid:
        author = fetch_author_by_orcid(user.orcid)
        if author:
            oa_id = _extract_openalex_id(author.get("id", ""))
            if oa_id:
                await AsyncOrm.update_user_openalex(current_user.id, oa_id)
                openalex_id = oa_id

    if not author:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Привяжите OpenAlex ID или ORCID для импорта данных.",
        )

    if not openalex_id:
        openalex_id = _extract_openalex_id(author.get("id", ""))

    works = fetch_author_works(openalex_id, per_page=25)
    mapped = map_author_to_researcher(author, works)

    researcher = await AsyncOrm.upsert_researcher_profile(
        current_user.id,
        full_name=mapped.get("full_name"),
        research_interests=mapped.get("research_interests"),
        education=mapped.get("education"),
        publications=mapped.get("publications"),
        hindex_openalex=mapped.get("hindex_openalex"),
    )
    logger.info("OpenAlex import completed: user_id=%s researcher_id=%s openalex_id=%s", current_user.id, researcher.id, openalex_id)
    return {"ok": True, "researcher_id": researcher.id}
