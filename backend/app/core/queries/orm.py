"""
AsyncOrm — нативный асинхронный слой для ядра: User, Role, Notifications.
Использует asyncpg и SQLAlchemy AsyncSession.
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy import select, func, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app import models
from app.database import async_session_factory
from app.config import settings
from app.core.queries.password_utils import hash_password, verify_password


class AsyncOrm:
    # =============================
    #           ROLES
    # =============================

    @staticmethod
    async def create_role(name: str) -> models.Role:
        async with async_session_factory() as session:
            role = models.Role(name=name)
            session.add(role)
            try:
                await session.commit()
            except IntegrityError:
                await session.rollback()
                raise ValueError("Role with this name already exists")
            await session.refresh(role)
            return role

    @staticmethod
    async def list_roles() -> List[models.Role]:
        async with async_session_factory() as session:
            stmt = select(models.Role)
            result = await session.execute(stmt)
            return list(result.scalars().all())

    @staticmethod
    async def get_or_create_role(name: str) -> models.Role:
        """Return existing role or create if missing. Never raises on duplicate."""
        async with async_session_factory() as session:
            stmt = select(models.Role).where(models.Role.name == name)
            result = await session.execute(stmt)
            role = result.scalars().first()
            if role:
                return role
            role = models.Role(name=name)
            session.add(role)
            await session.commit()
            await session.refresh(role)
            return role

    # =============================
    #           USERS
    # =============================

    @staticmethod
    async def create_user(mail: str, password: str, role_id: int) -> models.User:
        async with async_session_factory() as session:
            hashed = hash_password(password)
            user = models.User(mail=mail, hash_parameter=hashed, role_id=role_id)
            session.add(user)
            try:
                await session.commit()
            except IntegrityError:
                await session.rollback()
                raise ValueError("User with this mail already exists")
            await session.refresh(user)
            return user

    @staticmethod
    async def get_user(user_id: int) -> Optional[models.User]:
        async with async_session_factory() as session:
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def get_user_by_mail(mail: str) -> Optional[models.User]:
        async with async_session_factory() as session:
            stmt = select(models.User).where(models.User.mail == mail)
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def get_user_by_orcid(orcid: str) -> Optional[models.User]:
        async with async_session_factory() as session:
            normalized = orcid.replace("https://orcid.org/", "").strip()
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.orcid == normalized)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def create_user_orcid(
        mail: str,
        orcid: str,
        role_id: int,
        full_name: Optional[str] = None,
    ) -> models.User:
        async with async_session_factory() as session:
            normalized = orcid.replace("https://orcid.org/", "").strip()
            user = models.User(
                mail=mail,
                hash_parameter=None,
                orcid=normalized,
                role_id=role_id,
                full_name=full_name,
                email_verified=False,
            )
            session.add(user)
            try:
                await session.commit()
            except IntegrityError:
                await session.rollback()
                raise ValueError("User with this mail or ORCID already exists")
            await session.refresh(user)
            return user

    @staticmethod
    async def update_user_role(user_id: int, role_id: int) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            role = await session.get(models.Role, role_id)
            if not role:
                raise ValueError("Role not found")

            if role.name == "lab_representative":
                stmt = select(models.Organization).where(
                    models.Organization.creator_user_id == user_id
                )
                result = await session.execute(stmt)
                org = result.scalars().first()
                if org:
                    raise ValueError(
                        "Нельзя назначить роль представителя лаборатории пользователю, "
                        "который уже создал организацию."
                    )

            if role.name == "lab_admin":
                current_role = await session.get(models.Role, user.role_id)
                if current_role and current_role.name == "lab_representative":
                    stmt = select(models.OrganizationLaboratory).where(
                        models.OrganizationLaboratory.creator_user_id == user_id,
                        models.OrganizationLaboratory.organization_id.isnot(None),
                    )
                    result = await session.execute(stmt)
                    lab_with_org = result.scalars().first()
                    if lab_with_org:
                        raise ValueError(
                            "Представитель лаборатории, привязанной к организации, "
                            "не может сменить роль на представителя организации."
                        )

            user.role_id = role_id
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def link_orcid_to_user(user_id: int, orcid: str) -> models.User:
        normalized = orcid.replace("https://orcid.org/", "").strip()
        existing = await AsyncOrm.get_user_by_orcid(normalized)
        if existing and existing.id != user_id:
            raise ValueError("Этот ORCID уже привязан к другому аккаунту")
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.orcid = normalized
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def unlink_orcid(user_id: int) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            if not user.hash_parameter:
                raise ValueError("requires_password_first")
            user.orcid = None
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def update_user_password(user_id: int, password: str) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.hash_parameter = hash_password(password)
            user.token_version = getattr(user, "token_version", 0) + 1
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def update_user_openalex(user_id: int, openalex_id: Optional[str]) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.openalex_id = openalex_id
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def get_users_with_openalex_or_orcid() -> List[models.User]:
        async with async_session_factory() as session:
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(
                    (models.User.openalex_id.isnot(None))
                    | (models.User.orcid.isnot(None))
                )
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    @staticmethod
    async def update_user_profile(
        user_id: int,
        full_name: Optional[str] = None,
        contacts: Optional[Dict[str, Any]] = None,
    ) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            if full_name is not None:
                user.full_name = full_name
            if contacts is not None:
                user.contacts = contacts
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def update_user_avatar(user_id: int, photo_url: Optional[str]) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.photo_url = photo_url
            await session.commit()
            await session.refresh(user)
            return user

    # =============================
    #   EMAIL VERIFICATION
    # =============================

    @staticmethod
    async def verify_password(password: str, hashed: str) -> bool:
        return verify_password(password, hashed)

    @staticmethod
    async def create_verification_token(user_id: int) -> str:
        async with async_session_factory() as session:
            await session.execute(
                delete(models.EmailVerificationToken).where(
                    models.EmailVerificationToken.user_id == user_id
                )
            )
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(
                hours=settings.VERIFICATION_TOKEN_TTL_HOURS
            )
            rec = models.EmailVerificationToken(
                user_id=user_id, token=token, expires_at=expires_at
            )
            session.add(rec)
            await session.commit()
            return token

    @staticmethod
    async def verify_email_by_token(token: str) -> Optional[models.User]:
        async with async_session_factory() as session:
            stmt = select(models.EmailVerificationToken).where(
                models.EmailVerificationToken.token == token
            )
            result = await session.execute(stmt)
            rec = result.scalars().first()
            if not rec:
                return None
            now = datetime.now(timezone.utc)
            if rec.expires_at < now:
                session.delete(rec)
                await session.commit()
                return None
            user = await session.get(models.User, rec.user_id)
            if not user:
                session.delete(rec)
                await session.commit()
                return None
            user.email_verified = True
            session.delete(rec)
            await session.commit()
            await session.refresh(user)
            return user

    # =============================
    #   PASSWORD RESET TOKENS
    # =============================

    @staticmethod
    async def create_password_reset_token(user_id: int) -> str:
        async with async_session_factory() as session:
            await session.execute(
                delete(models.PasswordResetToken).where(
                    models.PasswordResetToken.user_id == user_id
                )
            )
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(
                hours=settings.PASSWORD_RESET_TTL_HOURS
            )
            rec = models.PasswordResetToken(
                user_id=user_id, token=token, expires_at=expires_at
            )
            session.add(rec)
            await session.commit()
            return token

    @staticmethod
    async def consume_password_reset_token(
        token: str, new_password: str
    ) -> Optional[models.User]:
        async with async_session_factory() as session:
            stmt = select(models.PasswordResetToken).where(
                models.PasswordResetToken.token == token
            )
            result = await session.execute(stmt)
            rec = result.scalars().first()
            if not rec:
                return None
            now = datetime.now(timezone.utc)
            if rec.expires_at < now:
                session.delete(rec)
                await session.commit()
                return None
            user = await session.get(models.User, rec.user_id)
            if not user:
                session.delete(rec)
                await session.commit()
                return None
            if user.hash_parameter and verify_password(
                new_password, user.hash_parameter
            ):
                raise ValueError("Новый пароль должен отличаться от текущего")
            user.hash_parameter = hash_password(new_password)
            user.token_version = getattr(user, "token_version", 0) + 1
            session.delete(rec)
            await session.commit()
            await session.refresh(user)
            return user

    # =============================
    #       ANALYTICS EVENTS
    # =============================

    @staticmethod
    async def insert_analytics_events(events: list[dict]) -> int:
        """Асинхронная вставка событий аналитики."""
        from app.core.models import AnalyticsEvent

        async with async_session_factory() as session:
            for ev in events:
                row = AnalyticsEvent(
                    event_type=ev["event_type"],
                    user_id=ev.get("user_id"),
                    session_id=ev.get("session_id"),
                    entity_type=ev.get("entity_type"),
                    entity_id=ev.get("entity_id"),
                    payload=ev.get("payload"),
                )
                session.add(row)
            await session.commit()
            return len(events)

    # =============================
    #       NOTIFICATIONS
    # =============================

    @staticmethod
    async def create_notification(
        user_id: int, type: str, data: Optional[Dict[str, Any]] = None
    ) -> models.Notification:
        async with async_session_factory() as session:
            n = models.Notification(user_id=user_id, type=type, data=data)
            session.add(n)
            await session.commit()
            await session.refresh(n)
            return n

    @staticmethod
    async def get_notifications_for_user(
        user_id: int, limit: int = 50
    ) -> List[models.Notification]:
        async with async_session_factory() as session:
            stmt = (
                select(models.Notification)
                .where(models.Notification.user_id == user_id)
                .order_by(models.Notification.created_at.desc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    @staticmethod
    async def get_unread_notification_count(user_id: int) -> int:
        async with async_session_factory() as session:
            stmt = select(func.count()).select_from(models.Notification).where(
                models.Notification.user_id == user_id,
                models.Notification.read_at.is_(None),
            )
            result = await session.execute(stmt)
            return result.scalar() or 0

    @staticmethod
    async def mark_notification_read(
        notification_id: int, user_id: int
    ) -> Optional[models.Notification]:
        async with async_session_factory() as session:
            stmt = select(models.Notification).where(
                models.Notification.id == notification_id,
                models.Notification.user_id == user_id,
            )
            result = await session.execute(stmt)
            n = result.scalars().first()
            if not n:
                return None
            n.read_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(n)
            return n

    @staticmethod
    async def delete_notification(notification_id: int, user_id: int) -> bool:
        async with async_session_factory() as session:
            stmt = select(models.Notification).where(
                models.Notification.id == notification_id,
                models.Notification.user_id == user_id,
            )
            result = await session.execute(stmt)
            n = result.scalars().first()
            if not n:
                return False
            session.delete(n)
            await session.commit()
            return True

    @staticmethod
    async def get_lab_admin_user_ids_for_organization(organization_id: int) -> List[int]:
        async with async_session_factory() as session:
            stmt = select(models.Role).where(models.Role.name == "lab_admin")
            result = await session.execute(stmt)
            lab_admin_role = result.scalars().first()
            if not lab_admin_role:
                return []
            stmt = select(models.User.id).where(
                models.User.role_id == lab_admin_role.id,
                models.User.organization_id == organization_id,
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())
