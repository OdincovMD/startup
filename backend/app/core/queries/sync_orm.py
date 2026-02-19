"""
Синхронный слой работы с БД для ядра: User, Role.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.database import session_factory
from app import models

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SyncOrm:
    # =============================
    #          ROLES
    # =============================

    @staticmethod
    def create_role(name: str) -> models.Role:
        with session_factory() as session:
            role = models.Role(name=name)
            session.add(role)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise ValueError("Role with this name already exists")
            session.refresh(role)
            return role

    @staticmethod
    def get_or_create_role(name: str) -> models.Role:
        """Return existing role or create if missing. Never raises on duplicate."""
        with session_factory() as session:
            role = session.scalar(select(models.Role).where(models.Role.name == name))
            if role:
                return role
            role = models.Role(name=name)
            session.add(role)
            session.commit()
            session.refresh(role)
            return role

    @staticmethod
    def list_roles() -> List[models.Role]:
        with session_factory() as session:
            stmt = select(models.Role)
            return list(session.scalars(stmt).all())

    # =============================
    #          USERS
    # =============================

    @staticmethod
    def hash_password(password: str) -> str:
        safe = SyncOrm._truncate_password(password)
        return pwd_context.hash(safe)

    @staticmethod
    def verify_password(password: str, hashed: Optional[str]) -> bool:
        if not hashed:
            return False
        safe = SyncOrm._truncate_password(password)
        return pwd_context.verify(safe, hashed)

    @staticmethod
    def _truncate_password(password: str) -> str:
        """Если пользователь ввёл слишком длинный пароль- необходимо обрезать."""
        raw = password.encode("utf-8")
        if len(raw) <= 72:
            return password
        return raw[:72].decode("utf-8", errors="ignore")

    @staticmethod
    def create_user(mail: str, password: str, role_id: int) -> models.User:
        with session_factory() as session:
            hashed = SyncOrm.hash_password(password)
            user = models.User(mail=mail, hash_parameter=hashed, role_id=role_id)
            session.add(user)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise ValueError("User with this mail already exists")
            session.refresh(user)
            return user

    @staticmethod
    def get_user(user_id: int) -> Optional[models.User]:
        with session_factory() as session:
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def get_user_by_mail(mail: str) -> Optional[models.User]:
        with session_factory() as session:
            stmt = select(models.User).where(models.User.mail == mail)
            return session.scalars(stmt).first()

    @staticmethod
    def get_user_by_orcid(orcid: str) -> Optional[models.User]:
        """Find user by ORCID (normalized format 0000-0001-2345-6789)."""
        with session_factory() as session:
            normalized = orcid.replace("https://orcid.org/", "").strip()
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.orcid == normalized)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def create_user_orcid(
        mail: str,
        orcid: str,
        role_id: int,
        full_name: Optional[str] = None,
    ) -> models.User:
        """Create user from ORCID auth (no password)."""
        with session_factory() as session:
            normalized = orcid.replace("https://orcid.org/", "").strip()
            user = models.User(
                mail=mail,
                hash_parameter=None,
                orcid=normalized,
                role_id=role_id,
                full_name=full_name,
            )
            session.add(user)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise ValueError("User with this mail or ORCID already exists")
            session.refresh(user)
            return user

    @staticmethod
    def update_user_role(user_id: int, role_id: int) -> models.User:
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            role = session.get(models.Role, role_id)
            if not role:
                raise ValueError("Role not found")

            if role.name == "lab_representative":
                stmt = select(models.Organization).where(models.Organization.creator_user_id == user_id)
                org = session.scalars(stmt).first()
                if org:
                    raise ValueError(
                        "Нельзя назначить роль представителя лаборатории пользователю, который уже создал организацию."
                    )

            if role.name == "lab_admin":
                current_role = session.get(models.Role, user.role_id)
                if current_role and current_role.name == "lab_representative":
                    lab_with_org = session.scalar(
                        select(models.OrganizationLaboratory).where(
                            models.OrganizationLaboratory.creator_user_id == user_id,
                            models.OrganizationLaboratory.organization_id.isnot(None),
                        )
                    )
                    if lab_with_org:
                        raise ValueError(
                            "Представитель лаборатории, привязанной к организации, не может сменить роль на представителя организации."
                        )

            user.role_id = role_id
            session.commit()
            session.refresh(user)
            return user

    @staticmethod
    def link_orcid_to_user(user_id: int, orcid: str) -> models.User:
        """Привязать ORCID к существующему пользователю."""
        normalized = orcid.replace("https://orcid.org/", "").strip()
        existing = SyncOrm.get_user_by_orcid(normalized)
        if existing and existing.id != user_id:
            raise ValueError("Этот ORCID уже привязан к другому аккаунту")
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.orcid = normalized
            session.commit()
            session.refresh(user)
            return user

    @staticmethod
    def unlink_orcid(user_id: int) -> models.User:
        """Отвязать ORCID от пользователя. Требует, чтобы у пользователя был пароль."""
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            if not user.hash_parameter:
                raise ValueError("requires_password_first")
            user.orcid = None
            session.commit()
            session.refresh(user)
            return user

    @staticmethod
    def update_user_password(user_id: int, password: str) -> models.User:
        """Установить или сменить пароль пользователя."""
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.hash_parameter = SyncOrm.hash_password(password)
            session.commit()
            session.refresh(user)
            return user

    @staticmethod
    def update_user_openalex(user_id: int, openalex_id: Optional[str]) -> models.User:
        """Привязать или отвязать OpenAlex ID от пользователя."""
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.openalex_id = openalex_id
            session.commit()
            session.refresh(user)
            return user

    @staticmethod
    def get_users_with_openalex_or_orcid() -> List[models.User]:
        """Пользователи с openalex_id или orcid для фоновой синхронизации."""
        with session_factory() as session:
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(
                    (models.User.openalex_id.isnot(None)) | (models.User.orcid.isnot(None))
                )
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def update_user_profile(
        user_id: int,
        full_name: Optional[str] = None,
        contacts: Optional[Dict[str, Any]] = None,
    ) -> models.User:
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            if full_name is not None:
                user.full_name = full_name
            if contacts is not None:
                user.contacts = contacts
            session.commit()
            session.refresh(user)
            return user

    @staticmethod
    def verify_email_by_token(token: str) -> Optional[models.User]:
        return None

    # =============================
    #       NOTIFICATIONS
    # =============================

    @staticmethod
    def create_notification(user_id: int, type: str, data: Optional[Dict[str, Any]] = None) -> models.Notification:
        with session_factory() as session:
            n = models.Notification(user_id=user_id, type=type, data=data)
            session.add(n)
            session.commit()
            session.refresh(n)
            return n

    @staticmethod
    def get_notifications_for_user(user_id: int, limit: int = 50) -> List[models.Notification]:
        with session_factory() as session:
            stmt = (
                select(models.Notification)
                .where(models.Notification.user_id == user_id)
                .order_by(models.Notification.created_at.desc())
                .limit(limit)
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def get_unread_notification_count(user_id: int) -> int:
        with session_factory() as session:
            stmt = select(func.count()).select_from(models.Notification).where(
                models.Notification.user_id == user_id,
                models.Notification.read_at.is_(None),
            )
            return session.scalar(stmt) or 0

    @staticmethod
    def mark_notification_read(notification_id: int, user_id: int) -> Optional[models.Notification]:
        with session_factory() as session:
            n = session.scalar(
                select(models.Notification).where(
                    models.Notification.id == notification_id,
                    models.Notification.user_id == user_id,
                )
            )
            if not n:
                return None
            n.read_at = datetime.now(timezone.utc)
            session.commit()
            session.refresh(n)
            return n

    @staticmethod
    def delete_notification(notification_id: int, user_id: int) -> bool:
        with session_factory() as session:
            n = session.scalar(
                select(models.Notification).where(
                    models.Notification.id == notification_id,
                    models.Notification.user_id == user_id,
                )
            )
            if not n:
                return False
            session.delete(n)
            session.commit()
            return True

    @staticmethod
    def get_lab_admin_user_ids_for_organization(organization_id: int) -> List[int]:
        """User IDs с ролью lab_admin и organization_id = org.id."""
        with session_factory() as session:
            lab_admin_role = session.scalar(select(models.Role).where(models.Role.name == "lab_admin"))
            if not lab_admin_role:
                return []
            stmt = (
                select(models.User.id)
                .where(
                    models.User.role_id == lab_admin_role.id,
                    models.User.organization_id == organization_id,
                )
            )
            return list(session.scalars(stmt).all())
