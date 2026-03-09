"""
Orm — асинхронный слой для ядра: User, Role, Notifications (asyncpg, SQLAlchemy AsyncSession).
"""

import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import select, func, delete, or_, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app import models
from app.database import async_session_factory
from app.config import settings
from app.core.queries.password_utils import hash_password, verify_password
from app.core.schemas import user_to_read


class Orm:
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
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            return (await session.execute(stmt)).scalars().first()

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
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.mail == mail)
            )
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
    async def get_user_by_public_id(public_id: str) -> Optional[models.User]:
        async with async_session_factory() as session:
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.student_profile),
                    selectinload(models.User.researcher_profile).selectinload(
                        models.Researcher.laboratories
                    ),
                )
                .where(models.User.public_id == public_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def list_published_applicants(
        page: int = 1,
        page_size: int = 20,
        role_filter: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Список опубликованных соискателей. Возвращает список dict (данные внутри сессии)."""
        order_desc = sort_by != "date_asc"
        order_clause = models.User.created_at.desc() if order_desc else models.User.created_at.asc()
        async with async_session_factory() as session:
            role_filter_cond = or_(
                and_(
                    models.Role.name == "student",
                    models.Student.is_published == True,
                ),
                and_(
                    models.Role.name == "researcher",
                    models.Researcher.is_published == True,
                ),
            )
            if role_filter == "student":
                role_filter_cond = and_(
                    models.Role.name == "student",
                    models.Student.is_published == True,
                )
            elif role_filter == "researcher":
                role_filter_cond = and_(
                    models.Role.name == "researcher",
                    models.Researcher.is_published == True,
                )
            base_stmt = (
                select(models.User.id)
                .join(models.Role, models.User.role_id == models.Role.id)
                .outerjoin(models.Student, models.User.id == models.Student.user_id)
                .outerjoin(models.Researcher, models.User.id == models.Researcher.user_id)
                .where(models.User.public_id.isnot(None), role_filter_cond)
            )
            count_stmt = select(func.count()).select_from(base_stmt.subquery())
            total = (await session.execute(count_stmt)).scalar() or 0
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.student_profile),
                    selectinload(models.User.researcher_profile),
                )
                .join(models.Role, models.User.role_id == models.Role.id)
                .outerjoin(models.Student, models.User.id == models.Student.user_id)
                .outerjoin(models.Researcher, models.User.id == models.Researcher.user_id)
                .where(models.User.public_id.isnot(None), role_filter_cond)
                .order_by(order_clause)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            result = await session.execute(stmt)
            users = list(result.unique().scalars().all())
            items = []
            for u in users:
                role_name = u.role.name if u.role else ""
                profile = u.student_profile if role_name == "student" else u.researcher_profile
                full_name = (profile.full_name if profile else None) or u.full_name or ""
                summary = None
                if profile:
                    summary = getattr(profile, "summary", None)
                    if not summary and role_name == "researcher":
                        summary = (getattr(profile, "job_search_notes", None) or "")[:200] or None
                items.append({
                    "public_id": u.public_id,
                    "full_name": full_name,
                    "photo_url": u.photo_url,
                    "role": role_name,
                    "summary": summary,
                })
            return items, int(total)

    @staticmethod
    async def list_all_published_applicant_users(
        role_filter: Optional[str] = None,
    ) -> List[models.User]:
        """Все опубликованные соискатели (User с role, student_profile, researcher_profile) для reindex ES."""
        async with async_session_factory() as session:
            role_filter_cond = or_(
                and_(
                    models.Role.name == "student",
                    models.Student.is_published == True,
                ),
                and_(
                    models.Role.name == "researcher",
                    models.Researcher.is_published == True,
                ),
            )
            if role_filter == "student":
                role_filter_cond = and_(
                    models.Role.name == "student",
                    models.Student.is_published == True,
                )
            elif role_filter == "researcher":
                role_filter_cond = and_(
                    models.Role.name == "researcher",
                    models.Researcher.is_published == True,
                )
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.student_profile),
                    selectinload(models.User.researcher_profile),
                )
                .join(models.Role, models.User.role_id == models.Role.id)
                .outerjoin(models.Student, models.User.id == models.Student.user_id)
                .outerjoin(models.Researcher, models.User.id == models.Researcher.user_id)
                .where(models.User.public_id.isnot(None), role_filter_cond)
                .order_by(models.User.id.desc())
            )
            result = await session.execute(stmt)
            return list(result.unique().scalars().all())

    @staticmethod
    async def get_applicant_user_for_index(user_id: int):
        """Загрузить User с профилями для индексации в ES. Возвращает (user, student, researcher) или None."""
        async with async_session_factory() as session:
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.student_profile),
                    selectinload(models.User.researcher_profile),
                )
                .where(models.User.id == user_id)
            )
            result = await session.execute(stmt)
            user = result.scalars().first()
            if not user or not user.role:
                return None
            if user.role.name not in ("student", "researcher"):
                return None
            return user

    @staticmethod
    async def get_applicant_detail_by_public_id(public_id: str) -> Optional[Dict[str, Any]]:
        """Загружает соискателя и возвращает dict для ApplicantDetail (внутри сессии)."""
        async with async_session_factory() as session:
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.student_profile),
                    selectinload(models.User.researcher_profile).selectinload(
                        models.Researcher.laboratories
                    ),
                )
                .where(models.User.public_id == public_id)
            )
            result = await session.execute(stmt)
            user = result.scalars().first()
            if not user:
                return None
            role_name = user.role.name if user.role else ""
            if role_name not in ("student", "researcher"):
                return None
            profile = user.student_profile if role_name == "student" else user.researcher_profile
            if not profile or not getattr(profile, "is_published", False):
                return None
            contacts = user.contacts if isinstance(user.contacts, dict) else {}
            mail = user.mail or contacts.get("email") or contacts.get("mail")
            full_name = (profile.full_name if profile else None) or user.full_name or ""
            out = {
                "public_id": user.public_id,
                "full_name": full_name,
                "photo_url": user.photo_url,
                "role": role_name,
                "mail": mail,
                "contacts": contacts,
            }
            if role_name == "student":
                out["status"] = getattr(profile, "status", None)
                out["summary"] = getattr(profile, "summary", None)
                out["education"] = profile.education or []
                out["skills"] = profile.skills or []
                out["research_interests"] = profile.research_interests or []
                out["resume_url"] = getattr(profile, "resume_url", None)
                out["document_urls"] = profile.document_urls or []
            else:
                out["position"] = getattr(profile, "position", None)
                out["academic_degree"] = getattr(profile, "academic_degree", None)
                out["research_interests"] = profile.research_interests or []
                out["education"] = profile.education or []
                out["publications"] = getattr(profile, "publications", None)
                out["hindex_wos"] = getattr(profile, "hindex_wos", None)
                out["hindex_scopus"] = getattr(profile, "hindex_scopus", None)
                out["hindex_rsci"] = getattr(profile, "hindex_rsci", None)
                out["hindex_openalex"] = getattr(profile, "hindex_openalex", None)
                out["resume_url"] = getattr(profile, "resume_url", None)
                out["document_urls"] = profile.document_urls or []
                out["job_search_status"] = getattr(profile, "job_search_status", None)
                out["desired_positions"] = getattr(profile, "desired_positions", None)
                out["employment_type_preference"] = getattr(profile, "employment_type_preference", None)
                out["preferred_region"] = getattr(profile, "preferred_region", None)
                out["availability_date"] = getattr(profile, "availability_date", None)
                out["salary_expectation"] = getattr(profile, "salary_expectation", None)
                out["job_search_notes"] = getattr(profile, "job_search_notes", None)
                if profile.laboratories:
                    out["laboratories"] = [
                        {"public_id": lab.public_id, "name": lab.name or ""}
                        for lab in profile.laboratories
                    ]
            return out

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
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            return (await session.execute(stmt)).scalars().first()

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
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            return (await session.execute(stmt)).scalars().first()

    @staticmethod
    async def link_orcid_to_user(user_id: int, orcid: str) -> models.User:
        normalized = orcid.replace("https://orcid.org/", "").strip()
        existing = await Orm.get_user_by_orcid(normalized)
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
            if openalex_id is not None:
                stmt = select(models.User).where(
                    models.User.openalex_id == openalex_id,
                    models.User.id != user_id,
                )
                result = await session.execute(stmt)
                if result.scalars().first() is not None:
                    raise ValueError("Этот OpenAlex ID уже привязан к другому аккаунту")
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
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            return (await session.execute(stmt)).scalars().first()

    @staticmethod
    async def update_user_avatar(user_id: int, photo_url: Optional[str]) -> models.User:
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")
            user.photo_url = photo_url
            await session.commit()
            await session.refresh(user)
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            return (await session.execute(stmt)).scalars().first()

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
    async def verify_email_by_token(token: str):
        """Возвращает UserRead при успехе, None при неверном/истёкшем токене."""
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
            stmt_user = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            user_with_role = (await session.execute(stmt_user)).scalars().first()
            return user_to_read(user_with_role) if user_with_role else None

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
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(models.User.id == user.id)
            )
            return (await session.execute(stmt)).scalars().first()

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

    # =============================
    #       SUBSCRIPTIONS
    # =============================

    @staticmethod
    async def has_active_subscription(user_id: int) -> bool:
        """Check if user has at least one active, non-expired subscription."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription.id).where(
                models.UserSubscription.user_id == user_id,
                models.UserSubscription.status == "active",
                (models.UserSubscription.expires_at.is_(None)) | (models.UserSubscription.expires_at > now),
            ).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first() is not None

    @staticmethod
    async def get_paid_user_ids(user_ids: list) -> set:
        """Given a list of user_ids, return the subset that have active subscriptions."""
        if not user_ids:
            return set()
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription.user_id).where(
                models.UserSubscription.user_id.in_(user_ids),
                models.UserSubscription.status == "active",
                (models.UserSubscription.expires_at.is_(None)) | (models.UserSubscription.expires_at > now),
            ).distinct()
            result = await session.execute(stmt)
            return set(result.scalars().all())

    @staticmethod
    async def get_active_subscription(user_id: int):
        """Return the active subscription for a user, or None."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription).where(
                models.UserSubscription.user_id == user_id,
                models.UserSubscription.status == "active",
                (models.UserSubscription.expires_at.is_(None)) | (models.UserSubscription.expires_at > now),
            ).order_by(models.UserSubscription.expires_at.desc().nulls_first()).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def create_subscription(
        user_id: int,
        audience: str = "representative",
        expires_at=None,
        activated_by: int = None,
    ):
        """Create a new active subscription for a user. Returns the subscription."""
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            sub = models.UserSubscription(
                user_id=user_id,
                audience=audience,
                status="active",
                expires_at=expires_at,
                activated_by=activated_by,
            )
            session.add(sub)
            try:
                await session.commit()
            except SQLAlchemyError:
                await session.rollback()
                raise
            await session.refresh(sub)
            event = models.SubscriptionEvent(
                subscription_id=sub.id,
                event_type="activated",
                performed_by=activated_by,
                details={"audience": audience},
            )
            session.add(event)
            try:
                await session.commit()
            except SQLAlchemyError:
                await session.rollback()
            return sub

    @staticmethod
    async def extend_subscription(subscription_id: int, new_expires_at, performed_by: int = None):
        """Extend an existing subscription's expiration date."""
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            sub = await session.get(models.UserSubscription, subscription_id)
            if not sub:
                return None
            old_expires = sub.expires_at
            sub.expires_at = new_expires_at
            sub.status = "active"
            event = models.SubscriptionEvent(
                subscription_id=sub.id,
                event_type="extended",
                performed_by=performed_by,
                details={"old_expires_at": old_expires.isoformat() if old_expires else None},
            )
            session.add(event)
            try:
                await session.commit()
            except SQLAlchemyError:
                await session.rollback()
                raise
            await session.refresh(sub)
            return sub

    @staticmethod
    async def cancel_subscription(subscription_id: int, performed_by: int = None):
        """Cancel an active subscription."""
        from datetime import datetime, timezone
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            sub = await session.get(models.UserSubscription, subscription_id)
            if not sub:
                return None
            sub.status = "cancelled"
            sub.cancelled_at = datetime.now(timezone.utc)
            event = models.SubscriptionEvent(
                subscription_id=sub.id,
                event_type="cancelled",
                performed_by=performed_by,
            )
            session.add(event)
            try:
                await session.commit()
            except SQLAlchemyError:
                await session.rollback()
                raise
            await session.refresh(sub)
            return sub

    @staticmethod
    async def list_subscriptions_for_user(user_id: int) -> list:
        """List all subscriptions for a user."""
        async with async_session_factory() as session:
            stmt = (
                select(models.UserSubscription)
                .where(models.UserSubscription.user_id == user_id)
                .order_by(models.UserSubscription.created_at.desc())
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    @staticmethod
    async def list_subscription_events(subscription_id: int) -> list:
        """List all events for a subscription."""
        async with async_session_factory() as session:
            stmt = (
                select(models.SubscriptionEvent)
                .where(models.SubscriptionEvent.subscription_id == subscription_id)
                .order_by(models.SubscriptionEvent.created_at.desc())
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())
