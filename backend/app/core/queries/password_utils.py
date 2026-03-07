"""
Утилиты для хеширования и проверки паролей.
Используются в Orm (async) для хеширования и проверки паролей.
"""

import hashlib
from typing import Optional

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _password_for_bcrypt(password: str) -> str:
    """Преобразует пароль любой длины в строку 64 символа (SHA256 hex), чтобы обойти лимит bcrypt 72 байта."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(_password_for_bcrypt(password))


def verify_password(password: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    if pwd_context.verify(_password_for_bcrypt(password), hashed):
        return True
    return _verify_password_legacy(password, hashed)


def _verify_password_legacy(password: str, hashed: str) -> bool:
    """Проверка старых хешей (пароль обрезался до 72 байт)."""
    raw = password.encode("utf-8")
    if len(raw) > 72:
        safe = raw[:72].decode("utf-8", errors="replace")
    else:
        safe = password
    return pwd_context.verify(safe, hashed)
