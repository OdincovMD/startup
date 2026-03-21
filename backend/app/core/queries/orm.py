"""
Orm — асинхронный слой для ядра: User, Role, Notifications (asyncpg, SQLAlchemy AsyncSession).
"""

import asyncio
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
    async def search_users_admin(query: str, limit: int = 20) -> List:
        """Search users by mail or full_name for admin (e.g. subscription creation)."""
        if not query or len(query.strip()) < 2:
            return []
        q = f"%{query.strip()}%"
        async with async_session_factory() as session:
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .where(
                    or_(
                        models.User.mail.ilike(q),
                        models.User.full_name.ilike(q),
                    )
                )
                .order_by(models.User.mail)
                .limit(limit)
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    @staticmethod
    async def list_users_admin(
        page: int = 1,
        size: int = 20,
        role_filter: Optional[str] = None,
        q: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List users for admin with pagination, role filter, and search. Returns (items, total)."""
        async with async_session_factory() as session:
            role_cond = True
            if role_filter:
                role_cond = models.Role.name == role_filter
            search_cond = True
            if q and q.strip():
                pattern = f"%{q.strip()}%"
                search_cond = or_(
                    models.User.mail.ilike(pattern),
                    models.User.full_name.ilike(pattern),
                )
            base_stmt = (
                select(models.User.id)
                .join(models.Role, models.User.role_id == models.Role.id)
                .where(role_cond, search_cond)
            )
            count_stmt = select(func.count()).select_from(base_stmt.subquery())
            total = (await session.execute(count_stmt)).scalar() or 0
            stmt = (
                select(models.User)
                .options(selectinload(models.User.role))
                .join(models.Role, models.User.role_id == models.Role.id)
                .where(role_cond, search_cond)
                .order_by(models.User.id.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
            result = await session.execute(stmt)
            users = list(result.unique().scalars().all())
            items = [
                {
                    "id": u.id,
                    "mail": u.mail or "",
                    "full_name": u.full_name or "",
                    "role_name": u.role.name if u.role else "",
                    "is_blocked": getattr(u, "is_blocked", False),
                    "created_at": u.created_at,
                }
                for u in users
            ]
            return items, int(total)

    @staticmethod
    async def set_user_blocked(user_id: int, blocked: bool) -> Optional[models.User]:
        """Set user is_blocked. When blocking, increment token_version to invalidate JWT."""
        async with async_session_factory() as session:
            user = await session.get(models.User, user_id)
            if not user:
                return None
            user.is_blocked = blocked
            if blocked:
                user.token_version = getattr(user, "token_version", 0) + 1
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def admin_trigger_password_reset(user_id: int) -> Optional[str]:
        """
        Admin-triggered password reset. Creates token and sends email.
        Returns reset_url on success, None if user not found or not verified.
        """
        from app.services.email import send_password_reset_email

        user = await Orm.get_user(user_id)
        if not user or not user.email_verified:
            return None
        token = await Orm.create_password_reset_token(user_id)
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        await asyncio.to_thread(send_password_reset_email, user.mail, reset_url)
        return reset_url

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
    async def list_students_admin(
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List all students (admin, no is_published filter). Returns (items, total)."""
        async with async_session_factory() as session:
            base_stmt = (
                select(models.User.id)
                .join(models.Role, models.User.role_id == models.Role.id)
                .join(models.Student, models.User.id == models.Student.user_id)
                .where(models.Role.name == "student")
            )
            count_stmt = select(func.count()).select_from(base_stmt.subquery())
            total = (await session.execute(count_stmt)).scalar() or 0
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.student_profile),
                )
                .join(models.Role, models.User.role_id == models.Role.id)
                .join(models.Student, models.User.id == models.Student.user_id)
                .where(models.Role.name == "student")
                .order_by(models.User.id.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
            result = await session.execute(stmt)
            users = list(result.unique().scalars().all())
            items = []
            for u in users:
                profile = u.student_profile
                full_name = (profile.full_name if profile else None) or u.full_name or ""
                items.append({
                    "user_id": u.id,
                    "id": u.id,
                    "public_id": u.public_id,
                    "full_name": full_name,
                    "is_published": getattr(profile, "is_published", False),
                    "created_at": u.created_at,
                })
            return items, int(total)

    @staticmethod
    async def list_researchers_admin(
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List all researchers (admin, no is_published filter). Returns (items, total)."""
        async with async_session_factory() as session:
            base_stmt = (
                select(models.User.id)
                .join(models.Role, models.User.role_id == models.Role.id)
                .join(models.Researcher, models.User.id == models.Researcher.user_id)
                .where(models.Role.name == "researcher")
            )
            count_stmt = select(func.count()).select_from(base_stmt.subquery())
            total = (await session.execute(count_stmt)).scalar() or 0
            stmt = (
                select(models.User)
                .options(
                    selectinload(models.User.role),
                    selectinload(models.User.researcher_profile),
                )
                .join(models.Role, models.User.role_id == models.Role.id)
                .join(models.Researcher, models.User.id == models.Researcher.user_id)
                .where(models.Role.name == "researcher")
                .order_by(models.User.id.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
            result = await session.execute(stmt)
            users = list(result.unique().scalars().all())
            items = []
            for u in users:
                profile = u.researcher_profile
                full_name = (profile.full_name if profile else None) or u.full_name or ""
                items.append({
                    "user_id": u.id,
                    "id": u.id,
                    "public_id": u.public_id,
                    "full_name": full_name,
                    "is_published": getattr(profile, "is_published", False),
                    "created_at": u.created_at,
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
    async def get_photo_urls_by_public_ids(public_ids: list) -> dict:
        """Возвращает {public_id: photo_url} для соискателей. Актуальные данные из БД."""
        if not public_ids:
            return {}
        async with async_session_factory() as session:
            stmt = select(models.User.public_id, models.User.photo_url).where(
                models.User.public_id.in_(public_ids),
                models.User.public_id.isnot(None),
            )
            result = await session.execute(stmt)
            return {row[0]: row[1] for row in result.fetchall() if row[0]}

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
                await session.delete(rec)
                await session.commit()
                return None
            user = await session.get(models.User, rec.user_id)
            if not user:
                await session.delete(rec)
                await session.commit()
                return None
            user.email_verified = True
            await session.delete(rec)
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
                await session.delete(rec)
                await session.commit()
                return None
            user = await session.get(models.User, rec.user_id)
            if not user:
                await session.delete(rec)
                await session.commit()
                return None
            if user.hash_parameter and verify_password(
                new_password, user.hash_parameter
            ):
                raise ValueError("Новый пароль должен отличаться от текущего")
            user.hash_parameter = hash_password(new_password)
            user.token_version = getattr(user, "token_version", 0) + 1
            await session.delete(rec)
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
        user_id: int, limit: int = 50, unread_only: bool = False
    ) -> List[models.Notification]:
        async with async_session_factory() as session:
            stmt = (
                select(models.Notification)
                .where(models.Notification.user_id == user_id)
                .order_by(models.Notification.created_at.desc())
                .limit(limit)
            )
            if unread_only:
                stmt = stmt.where(models.Notification.read_at.is_(None))
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
    async def mark_notification_read_and_delete(notification_id: int, user_id: int) -> bool:
        """Mark as read and delete in one transaction. Returns True if found and deleted."""
        async with async_session_factory() as session:
            stmt = delete(models.Notification).where(
                models.Notification.id == notification_id,
                models.Notification.user_id == user_id,
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount > 0

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
            await session.delete(n)
            await session.commit()
            return True

    @staticmethod
    async def delete_subscription_request_notifications(request_id: int) -> int:
        """Delete subscription-related notifications after request is resolved.
        - subscription_request_created (admin): stale 'user wants subscription'
        - subscription_request_sent (user): redundant after approved/rejected"""
        async with async_session_factory() as session:
            stmt = select(models.Notification).where(
                models.Notification.type.in_(
                    ("subscription_request_created", "subscription_request_sent"),
                ),
            )
            result = await session.execute(stmt)
            notifications = result.scalars().all()
            to_delete = [n for n in notifications if (n.data or {}).get("request_id") == request_id]
            for n in to_delete:
                await session.delete(n)
            if to_delete:
                await session.commit()
            return len(to_delete)

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
    def _subscription_paid_filter(now):
        """Filter for paid (active or trial) subscription. Requires status=active."""
        return or_(
            and_(
                models.UserSubscription.status == "active",
                or_(
                    models.UserSubscription.expires_at.is_(None),
                    models.UserSubscription.expires_at > now,
                ),
            ),
            and_(
                models.UserSubscription.status == "active",
                models.UserSubscription.trial_ends_at.isnot(None),
                models.UserSubscription.trial_ends_at > now,
            ),
        )

    @staticmethod
    async def has_active_subscription(user_id: int) -> bool:
        """Check if user has at least one active, non-expired subscription or active trial."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription.id).where(
                models.UserSubscription.user_id == user_id,
                Orm._subscription_paid_filter(now),
            ).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first() is not None

    @staticmethod
    async def get_paid_user_ids(user_ids: list) -> set:
        """Given a list of user_ids, return the subset that have active subscriptions or trials."""
        if not user_ids:
            return set()
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription.user_id).where(
                models.UserSubscription.user_id.in_(user_ids),
                Orm._subscription_paid_filter(now),
            ).distinct()
            result = await session.execute(stmt)
            return set(result.scalars().all())

    @staticmethod
    async def get_paid_pro_user_ids(user_ids: list) -> set:
        """Users with active Pro subscription (for org-wide lab inheritance)."""
        if not user_ids:
            return set()
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription.user_id).where(
                models.UserSubscription.user_id.in_(user_ids),
                Orm._subscription_paid_filter(now),
                models.UserSubscription.tier == "pro",
            ).distinct()
            result = await session.execute(stmt)
            return set(result.scalars().all())

    @staticmethod
    async def get_creator_first_entity_date(user_id: int):
        """Earliest first_created_at/created_at of org or lab by this creator. For grace period."""
        async with async_session_factory() as session:
            dates = []
            # Orgs: use first_created_at or created_at
            stmt = select(func.coalesce(
                func.min(models.Organization.first_created_at),
                func.min(models.Organization.created_at),
            )).where(models.Organization.creator_user_id == user_id)
            res = await session.execute(stmt)
            d = res.scalar()
            if d:
                dates.append(d)
            # Labs
            stmt = select(func.coalesce(
                func.min(models.OrganizationLaboratory.first_created_at),
                func.min(models.OrganizationLaboratory.created_at),
            )).where(models.OrganizationLaboratory.creator_user_id == user_id)
            res = await session.execute(stmt)
            d = res.scalar()
            if d:
                dates.append(d)
            return min(dates) if dates else None

    @staticmethod
    async def is_creator_in_grace_period(user_id: int, grace_days: int = 7) -> bool:
        """True if user created first org/lab within last grace_days and has no subscription."""
        if await Orm.has_active_subscription(user_id):
            return False
        first = await Orm.get_creator_first_entity_date(user_id)
        if not first:
            return False
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        cutoff = first + timedelta(days=grace_days) if hasattr(first, "__add__") else None
        if not cutoff:
            return False
        return now < cutoff

    @staticmethod
    async def get_subscription_tier(user_id: int) -> Optional[str]:
        """Return subscription tier ('basic' or 'pro') if user has active subscription, else None."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription).where(
                models.UserSubscription.user_id == user_id,
                Orm._subscription_paid_filter(now),
            ).limit(1)
            result = await session.execute(stmt)
            sub = result.scalars().first()
            if not sub:
                return None
            return getattr(sub, "tier", None) or "pro"

    @staticmethod
    async def get_active_subscription(user_id: int):
        """Return the active subscription for a user, or None."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription).where(
                models.UserSubscription.user_id == user_id,
                Orm._subscription_paid_filter(now),
            ).order_by(models.UserSubscription.expires_at.desc().nulls_first()).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def _cancel_active_subscriptions_in_session(session, user_id: int, now, performed_by: int = None) -> list:
        """Cancel all active subscriptions for a user within the given session. Caller must commit."""
        stmt = select(models.UserSubscription).where(
            models.UserSubscription.user_id == user_id,
            Orm._subscription_paid_filter(now),
        )
        result = await session.execute(stmt)
        subs = list(result.scalars().all())
        for sub in subs:
            sub.status = "cancelled"
            sub.cancelled_at = now
            session.add(models.SubscriptionEvent(
                subscription_id=sub.id,
                event_type="cancelled",
                performed_by=performed_by,
                details={"reason": "replaced_by_new_subscription"},
            ))
        return subs

    @staticmethod
    async def _create_subscription_in_session(
        session, user_id: int, audience: str, tier: str,
        expires_at=None, trial_ends_at=None, activated_by: int = None, details: dict = None,
    ):
        """Create UserSubscription and SubscriptionEvent within session. Caller must flush/commit. Returns sub."""
        sub = models.UserSubscription(
            user_id=user_id,
            audience=audience,
            tier=tier,
            status="active",
            expires_at=expires_at,
            trial_ends_at=trial_ends_at,
            activated_by=activated_by,
        )
        session.add(sub)
        await session.flush()  # get sub.id
        event = models.SubscriptionEvent(
            subscription_id=sub.id,
            event_type="activated",
            performed_by=activated_by,
            details=details or {"audience": audience, "tier": tier, "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None},
        )
        session.add(event)
        return sub

    @staticmethod
    async def create_subscription(
        user_id: int,
        audience: str = "representative",
        tier: str = "pro",
        expires_at=None,
        trial_ends_at=None,
        activated_by: int = None,
    ):
        """Create a new active subscription for a user. Returns the subscription."""
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            sub = await Orm._create_subscription_in_session(
                session, user_id=user_id, audience=audience, tier=tier,
                expires_at=expires_at, trial_ends_at=trial_ends_at, activated_by=activated_by,
            )
            try:
                await session.commit()
            except SQLAlchemyError:
                await session.rollback()
                raise
            await session.refresh(sub)
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
            sub.renewal_count = (sub.renewal_count or 0) + 1
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
        """Cancel an active subscription. Idempotent: returns sub if already cancelled."""
        from datetime import datetime, timezone
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            sub = await session.get(models.UserSubscription, subscription_id)
            if not sub:
                return None
            if sub.status == "cancelled":
                return sub
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
    async def cancel_active_subscriptions_for_user(user_id: int, performed_by: int = None) -> list:
        """Cancel all active subscriptions for a user (to enforce single active sub)."""
        from datetime import datetime, timezone
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            subs = await Orm._cancel_active_subscriptions_in_session(session, user_id, now, performed_by)
            if subs:
                try:
                    await session.commit()
                    for s in subs:
                        await session.refresh(s)
                except SQLAlchemyError:
                    await session.rollback()
                    raise
            return subs

    @staticmethod
    async def list_expired_subscriptions_to_notify() -> List[dict]:
        """Subscriptions that just expired: status=active and (expires_at <= now or trial ended).
        Marks them expired and returns list of {user_id, tier, ...} for notification."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = select(models.UserSubscription).where(
                models.UserSubscription.status == "active",
                or_(
                    and_(
                        models.UserSubscription.expires_at.isnot(None),
                        models.UserSubscription.expires_at <= now,
                    ),
                    and_(
                        models.UserSubscription.trial_ends_at.isnot(None),
                        models.UserSubscription.trial_ends_at <= now,
                    ),
                ),
            )
            result = await session.execute(stmt)
            subs = list(result.scalars().all())
            items = [
                {
                    "id": s.id,
                    "user_id": s.user_id,
                    "tier": s.tier,
                    "expires_at": s.expires_at,
                    "trial_ends_at": s.trial_ends_at,
                }
                for s in subs
            ]
            for sub in subs:
                sub.status = "expired"
            if subs:
                try:
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
            return items

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

    # =============================
    #   SUBSCRIPTION REQUESTS
    # =============================

    @staticmethod
    async def has_active_paid_subscription(user_id: int) -> bool:
        """True if user has active subscription that is NOT trial-only.
        Trial exemption: user with only trial can still request."""
        from datetime import datetime, timezone
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            # Active paid = status active, (expires_at null or > now), and NOT in trial (trial_ends_at null or <= now)
            stmt = select(models.UserSubscription.id).where(
                models.UserSubscription.user_id == user_id,
                models.UserSubscription.status == "active",
                or_(
                    models.UserSubscription.expires_at.is_(None),
                    models.UserSubscription.expires_at > now,
                ),
                or_(
                    models.UserSubscription.trial_ends_at.is_(None),
                    models.UserSubscription.trial_ends_at <= now,
                ),
            ).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first() is not None

    @staticmethod
    async def get_pending_subscription_requests_for_user(user_id: int) -> List[models.SubscriptionRequest]:
        """List pending requests for a user."""
        async with async_session_factory() as session:
            stmt = (
                select(models.SubscriptionRequest)
                .where(
                    models.SubscriptionRequest.user_id == user_id,
                    models.SubscriptionRequest.status == "pending",
                )
                .order_by(models.SubscriptionRequest.created_at.desc())
            )
            result = await session.execute(stmt)
            return list(result.scalars().all())

    @staticmethod
    async def has_ever_had_trial_subscription(user_id: int) -> bool:
        """True if user has ever had a trial subscription (any approved or past)."""
        async with async_session_factory() as session:
            stmt = select(models.UserSubscription.id).where(
                models.UserSubscription.user_id == user_id,
                models.UserSubscription.trial_ends_at.isnot(None),
            ).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first() is not None

    @staticmethod
    async def has_ever_had_paid_subscription(user_id: int) -> bool:
        """True if user ever had Basic or Pro that was NOT trial-only (trial_ends_at null)."""
        async with async_session_factory() as session:
            stmt = select(models.UserSubscription.id).where(
                models.UserSubscription.user_id == user_id,
                models.UserSubscription.trial_ends_at.is_(None),
            ).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first() is not None

    @staticmethod
    async def get_pending_subscription_request(user_id: int, audience: str, tier: str, is_trial: bool):
        """Get pending request for same subscription type."""
        async with async_session_factory() as session:
            stmt = select(models.SubscriptionRequest).where(
                models.SubscriptionRequest.user_id == user_id,
                models.SubscriptionRequest.audience == audience,
                models.SubscriptionRequest.tier == tier,
                models.SubscriptionRequest.is_trial == is_trial,
                models.SubscriptionRequest.status == "pending",
            ).limit(1)
            result = await session.execute(stmt)
            return result.scalars().first()

    @staticmethod
    async def create_subscription_request(
        user_id: int,
        audience: str = "representative",
        tier: str = "pro",
        is_trial: bool = False,
    ) -> models.SubscriptionRequest:
        async with async_session_factory() as session:
            req = models.SubscriptionRequest(
                user_id=user_id,
                audience=audience,
                tier=tier,
                is_trial=is_trial,
                status="pending",
            )
            session.add(req)
            await session.commit()
            await session.refresh(req)
            return req

    @staticmethod
    async def list_subscription_requests(
        status_filter: Optional[str] = None,
        limit: int = 100,
    ) -> List:
        """List subscription requests, optionally filtered by status."""
        async with async_session_factory() as session:
            stmt = (
                select(models.SubscriptionRequest, models.User)
                .join(models.User, models.SubscriptionRequest.user_id == models.User.id)
                .order_by(models.SubscriptionRequest.created_at.desc())
                .limit(limit)
            )
            if status_filter:
                stmt = stmt.where(models.SubscriptionRequest.status == status_filter)
            result = await session.execute(stmt)
            rows = result.all()
            return list(rows)

    @staticmethod
    async def get_subscription_request_by_id(request_id: int):
        async with async_session_factory() as session:
            stmt = (
                select(models.SubscriptionRequest, models.User)
                .join(models.User, models.SubscriptionRequest.user_id == models.User.id)
                .where(models.SubscriptionRequest.id == request_id)
            )
            result = await session.execute(stmt)
            row = result.first()
            if not row:
                return None
            return {"request": row[0], "user": row[1]}

    @staticmethod
    async def get_platform_admin_user_ids() -> List[int]:
        """Return user IDs of all platform admins (for notifications)."""
        async with async_session_factory() as session:
            stmt = (
                select(models.User.id)
                .join(models.Role, models.User.role_id == models.Role.id)
                .where(models.Role.name == "platform_admin")
            )
            result = await session.execute(stmt)
            return [r for r, in result.all()]

    @staticmethod
    async def approve_subscription_request(
        request_id: int,
        resolved_by: int,
        expires_at=None,
        trial_ends_at=None,
    ):
        """Approve request: create subscription, mark request resolved.
        Cancels any existing active subscription (one sub per user).
        Single transaction with SELECT FOR UPDATE to prevent race conditions."""
        from datetime import datetime, timezone, timedelta
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            stmt = (
                select(models.SubscriptionRequest)
                .where(
                    models.SubscriptionRequest.id == request_id,
                    models.SubscriptionRequest.status == "pending",
                )
                .with_for_update()
            )
            result = await session.execute(stmt)
            req = result.scalars().first()
            if not req:
                return None
            await Orm._cancel_active_subscriptions_in_session(
                session, req.user_id, now, performed_by=resolved_by
            )
            if req.is_trial and trial_ends_at is None:
                trial_ends_at = now + timedelta(days=14)
            sub = await Orm._create_subscription_in_session(
                session,
                user_id=req.user_id,
                audience=req.audience,
                tier=req.tier,
                expires_at=expires_at,
                trial_ends_at=trial_ends_at if req.is_trial else None,
                activated_by=resolved_by,
                details={"from_request": request_id, "audience": req.audience, "tier": req.tier},
            )
            req.status = "approved"
            req.resolved_at = now
            req.resolved_by = resolved_by
            try:
                await session.commit()
                await session.refresh(sub)
                await session.refresh(req)
            except SQLAlchemyError:
                await session.rollback()
                raise
            return {"request": req, "subscription": sub}

    @staticmethod
    async def reject_subscription_request(request_id: int, resolved_by: int, rejection_reason: str = None):
        """Reject a subscription request."""
        from datetime import datetime, timezone
        from sqlalchemy.exc import SQLAlchemyError
        async with async_session_factory() as session:
            req = await session.get(models.SubscriptionRequest, request_id)
            if not req or req.status != "pending":
                return None
            req.status = "rejected"
            req.resolved_at = datetime.now(timezone.utc)
            req.resolved_by = resolved_by
            req.rejection_reason = rejection_reason
            try:
                await session.commit()
                await session.refresh(req)
            except SQLAlchemyError:
                await session.rollback()
                raise
            return req
