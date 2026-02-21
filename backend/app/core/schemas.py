"""
Pydantic-схемы для ядра: User, Role, Notification.
"""

from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, EmailStr, computed_field, field_validator

from app.common import ORMModel


# =========================
#          ROLES
# =========================

class RoleCreate(BaseModel):
    name: str


_ROLE_DISPLAY_NAMES = {
    "student": "Студент",
    "researcher": "Исследователь",
    "lab_admin": "Представитель организации",
    "lab_representative": "Представитель лаборатории",
}


class RoleRead(ORMModel):
    id: int
    name: str

    @computed_field
    @property
    def display_name(self) -> str:
        return _ROLE_DISPLAY_NAMES.get(self.name, self.name)


# =========================
#           USERS
# =========================

class UserBase(BaseModel):
    mail: EmailStr
    role_id: int


class UserCreate(UserBase):
    password: str


class UserRead(ORMModel, UserBase):
    id: int
    email_verified: bool
    created_at: datetime
    full_name: Optional[str] = None
    photo_url: Optional[str] = None
    orcid: Optional[str] = None
    openalex_id: Optional[str] = None
    contacts: Optional[Dict[str, Any]] = None
    has_password: bool = False

    @field_validator("has_password", mode="before")
    @classmethod
    def coerce_has_password(cls, v):
        try:
            if v is None:
                return False
            return bool(v)
        except Exception:
            return False


def user_to_read(user) -> UserRead:
    """Convert User model to UserRead. Avoids model_validate issues with ORM."""
    return UserRead(
        id=user.id,
        mail=user.mail,
        role_id=user.role_id,
        email_verified=user.email_verified,
        created_at=user.created_at,
        full_name=user.full_name,
        photo_url=user.photo_url,
        orcid=user.orcid,
        openalex_id=user.openalex_id,
        contacts=user.contacts,
        has_password=user.has_password,
    )


class UserRoleUpdate(BaseModel):
    role_id: int


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    contacts: Optional[Dict[str, Any]] = None


class UserAvatarUpdate(BaseModel):
    photo_url: Optional[str] = None


class SetPasswordRequest(BaseModel):
    """Установка пароля для пользователя, зарегистрированного через ORCID."""
    password: str
    password_confirm: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Пароль должен быть не короче 8 символов")
        return v

    @field_validator("password_confirm")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Пароли не совпадают")
        if len(v) < 8:
            raise ValueError("Пароль должен быть не короче 8 символов")
        return v


class LoginRequest(BaseModel):
    mail: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class EmailVerificationRequest(BaseModel):
    token: str


class OrcidCompleteRequest(BaseModel):
    """Дорегистрация после первого входа через ORCID. Роль задаётся в профиле."""
    orcid: str
    mail: EmailStr
    role_id: int = 2  # researcher по умолчанию
    full_name: Optional[str] = None


# =========================
#        NOTIFICATIONS
# =========================

class NotificationBase(BaseModel):
    user_id: int
    type: str
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(ORMModel, NotificationBase):
    id: int
    created_at: datetime
    read_at: Optional[datetime] = None
