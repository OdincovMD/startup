"""
AsyncOrm — асинхронная обёртка над SyncOrm для ядра: User, Role.
"""

import asyncio
from typing import List, Optional, Dict, Any

from app import models
from app.core.queries.sync_orm import SyncOrm


class AsyncOrm:
    # =============================
    #           ROLES
    # =============================
    @staticmethod
    async def create_role(name: str) -> models.Role:
        return await asyncio.to_thread(SyncOrm.create_role, name)

    @staticmethod
    async def list_roles() -> List[models.Role]:
        return await asyncio.to_thread(SyncOrm.list_roles)

    # =============================
    #           USERS
    # =============================
    @staticmethod
    async def create_user(mail: str, password: str, role_id: int) -> models.User:
        return await asyncio.to_thread(SyncOrm.create_user, mail, password, role_id)

    @staticmethod
    async def get_user(user_id: int) -> Optional[models.User]:
        return await asyncio.to_thread(SyncOrm.get_user, user_id)

    @staticmethod
    async def get_user_by_mail(mail: str) -> Optional[models.User]:
        return await asyncio.to_thread(SyncOrm.get_user_by_mail, mail)

    @staticmethod
    async def get_user_by_orcid(orcid: str) -> Optional[models.User]:
        return await asyncio.to_thread(SyncOrm.get_user_by_orcid, orcid)

    @staticmethod
    async def create_user_orcid(
        mail: str,
        orcid: str,
        role_id: int,
        full_name: Optional[str] = None,
    ) -> models.User:
        return await asyncio.to_thread(
            SyncOrm.create_user_orcid,
            mail,
            orcid,
            role_id,
            full_name,
        )

    async def update_user_role(user_id: int, role_id: int) -> models.User:
        return await asyncio.to_thread(SyncOrm.update_user_role, user_id, role_id)

    @staticmethod
    async def link_orcid_to_user(user_id: int, orcid: str) -> models.User:
        return await asyncio.to_thread(SyncOrm.link_orcid_to_user, user_id, orcid)

    @staticmethod
    async def unlink_orcid(user_id: int) -> models.User:
        return await asyncio.to_thread(SyncOrm.unlink_orcid, user_id)

    @staticmethod
    async def update_user_password(user_id: int, password: str) -> models.User:
        return await asyncio.to_thread(SyncOrm.update_user_password, user_id, password)

    @staticmethod
    async def update_user_openalex(user_id: int, openalex_id: Optional[str]) -> models.User:
        return await asyncio.to_thread(SyncOrm.update_user_openalex, user_id, openalex_id)

    @staticmethod
    async def get_users_with_openalex_or_orcid() -> List[models.User]:
        return await asyncio.to_thread(SyncOrm.get_users_with_openalex_or_orcid)

    async def update_user_profile(
        user_id: int,
        full_name: Optional[str] = None,
        contacts: Optional[Dict[str, Any]] = None,
    ) -> models.User:
        return await asyncio.to_thread(
            SyncOrm.update_user_profile,
            user_id,
            full_name,
            contacts,
        )

    @staticmethod
    async def update_user_avatar(user_id: int, photo_url: Optional[str]) -> models.User:
        return await asyncio.to_thread(SyncOrm.update_user_avatar, user_id, photo_url)

    @staticmethod
    async def verify_password(password: str, hashed: str) -> bool:
        return await asyncio.to_thread(SyncOrm.verify_password, password, hashed)

    @staticmethod
    async def verify_email_by_token(token: str) -> Optional[models.User]:
        return await asyncio.to_thread(SyncOrm.verify_email_by_token, token)

    # =============================
    #       NOTIFICATIONS
    # =============================

    @staticmethod
    async def create_notification(user_id: int, type: str, data: Optional[Dict[str, Any]] = None) -> models.Notification:
        return await asyncio.to_thread(SyncOrm.create_notification, user_id, type, data)

    @staticmethod
    async def get_notifications_for_user(user_id: int, limit: int = 50) -> List[models.Notification]:
        return await asyncio.to_thread(SyncOrm.get_notifications_for_user, user_id, limit)

    @staticmethod
    async def get_unread_notification_count(user_id: int) -> int:
        return await asyncio.to_thread(SyncOrm.get_unread_notification_count, user_id)

    @staticmethod
    async def mark_notification_read(notification_id: int, user_id: int) -> Optional[models.Notification]:
        return await asyncio.to_thread(SyncOrm.mark_notification_read, notification_id, user_id)

    @staticmethod
    async def delete_notification(notification_id: int, user_id: int) -> bool:
        return await asyncio.to_thread(SyncOrm.delete_notification, notification_id, user_id)

    @staticmethod
    async def get_lab_admin_user_ids_for_organization(organization_id: int) -> List[int]:
        return await asyncio.to_thread(SyncOrm.get_lab_admin_user_ids_for_organization, organization_id)
