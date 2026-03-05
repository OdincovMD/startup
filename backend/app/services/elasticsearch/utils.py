"""
Вспомогательные функции для Elasticsearch (парсинг, сортировка).
"""

import re
from typing import List, Optional


def extract_skills(requirements: Optional[str], description: Optional[str], max_skills: int = 8) -> List[str]:
    """Извлечь навыки из requirements и description (разбивка по [,;\\n·])."""
    text = " ".join(filter(None, [requirements or "", description or ""]))
    if not text.strip():
        return []
    parts = re.split(r"[,;\n·]", text)
    skills = [s.strip() for s in parts if s and 0 < len(s.strip()) <= 40]
    return list(dict.fromkeys(skills))[:max_skills]


def significant_words(text: Optional[str]) -> List[str]:
    """Слова длиной > 2 из текста."""
    if not text:
        return []
    return [w for w in text.split() if len(w) > 2]


def escape_wildcard(val: str) -> str:
    """Экранировать * и ? для wildcard-запроса Elasticsearch."""
    return (val or "").replace("\\", "\\\\").replace("*", "\\*").replace("?", "\\?")


def sort_by_date(sort_by: Optional[str], default_desc: bool = True) -> list:
    """Вернуть sort для ES: [{"created_at": {"order": "desc"|"asc"}}]."""
    if sort_by == "date_asc":
        return [{"created_at": {"order": "asc"}}]
    return [{"created_at": {"order": "desc"}}]
