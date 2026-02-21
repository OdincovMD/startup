"""
Синхронный слой работы с БД для домена организаций.
"""

from typing import List, Optional

import secrets
import string

from sqlalchemy import select, func, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError

from app.database import session_factory
from app import models
from app.roles.researcher.queries.sync_orm import SyncOrm as ResearcherSyncOrm
from app.roles.student.queries.sync_orm import SyncOrm as StudentSyncOrm


class SyncOrm:
    @staticmethod
    def _generate_public_id() -> str:
        alphabet = string.ascii_uppercase + string.digits
        def part(size: int) -> str:
            return "".join(secrets.choice(alphabet) for _ in range(size))
        return f"R-{part(5)}-{part(5)}-{part(5)}"

    @staticmethod
    def _ensure_unique_public_id(session) -> str:
        while True:
            candidate = SyncOrm._generate_public_id()
            stmt = select(models.Organization).where(models.Organization.public_id == candidate)
            if session.scalars(stmt).first() is None:
                return candidate

    @staticmethod
    def _ensure_unique_query_public_id(session) -> str:
        while True:
            candidate = SyncOrm._generate_public_id()
            stmt = select(models.OrganizationQuery).where(models.OrganizationQuery.public_id == candidate)
            if session.scalars(stmt).first() is None:
                return candidate

    @staticmethod
    def _ensure_unique_vacancy_public_id(session) -> str:
        while True:
            candidate = SyncOrm._generate_public_id()
            stmt = select(models.VacancyOrganization).where(models.VacancyOrganization.public_id == candidate)
            if session.scalars(stmt).first() is None:
                return candidate

    @staticmethod
    def _ensure_unique_lab_public_id(session) -> str:
        while True:
            candidate = SyncOrm._generate_public_id()
            stmt = select(models.OrganizationLaboratory).where(models.OrganizationLaboratory.public_id == candidate)
            if session.scalars(stmt).first() is None:
                return candidate

    # =============================
    #       ORGANIZATIONS
    # =============================

    @staticmethod
    def create_organization(
        name: str,
        avatar_url: Optional[str] = None,
        description: Optional[str] = None,
        address: Optional[str] = None,
        website: Optional[str] = None,
    ) -> models.Organization:
        with session_factory() as session:
            org = models.Organization(
                name=name,
                avatar_url=avatar_url,
                description=description,
                address=address,
                website=website,
            )
            session.add(org)
            session.flush()
            if not org.public_id:
                org.public_id = SyncOrm._ensure_unique_public_id(session)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            session.refresh(org)
            return org

    @staticmethod
    def get_organization(org_id: int) -> Optional[models.Organization]:
        with session_factory() as session:
            stmt = select(models.Organization).where(models.Organization.id == org_id)
            org = session.scalars(stmt).first()
            if org and not org.public_id:
                org.public_id = SyncOrm._ensure_unique_public_id(session)
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
                session.refresh(org)
            return org

    @staticmethod
    def get_organization_by_public_id(public_id: str) -> Optional[models.Organization]:
        with session_factory() as session:
            stmt = select(models.Organization).where(models.Organization.public_id == public_id)
            return session.scalars(stmt).first()

    @staticmethod
    def update_organization_ror(organization_id: int, ror_id: Optional[str]) -> models.Organization:
        """Привязать или отвязать ROR ID от организации."""
        with session_factory() as session:
            org = session.get(models.Organization, organization_id)
            if not org:
                raise ValueError("Organization not found")
            org.ror_id = ror_id
            session.commit()
            session.refresh(org)
            return org

    @staticmethod
    def get_organizations_with_ror() -> List[models.Organization]:
        """Организации с ror_id для фоновой синхронизации."""
        with session_factory() as session:
            stmt = select(models.Organization).where(models.Organization.ror_id.isnot(None))
            return list(session.scalars(stmt).all())

    @staticmethod
    def update_organization_fields(
        organization_id: int,
        name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        address: Optional[str] = None,
        website: Optional[str] = None,
    ) -> Optional[models.Organization]:
        """Обновить поля организации по id (для фоновой синхронизации)."""
        with session_factory() as session:
            org = session.get(models.Organization, organization_id)
            if not org:
                return None
            if name is not None:
                org.name = name
            if avatar_url is not None:
                org.avatar_url = avatar_url
            if address is not None:
                org.address = address
            if website is not None:
                org.website = website
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            session.refresh(org)
            return org

    @staticmethod
    def list_organizations() -> List[models.Organization]:
        with session_factory() as session:
            stmt = select(models.Organization)
            orgs = list(session.scalars(stmt).all())
            needs_update = False
            for org in orgs:
                if not org.public_id:
                    org.public_id = SyncOrm._ensure_unique_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return orgs

    @staticmethod
    def list_published_organizations() -> List[models.Organization]:
        """
        Список только опубликованных организаций для публичных страниц.
        """
        with session_factory() as session:
            stmt = select(models.Organization).where(models.Organization.is_published.is_(True))
            orgs = list(session.scalars(stmt).all())
            # Гарантируем, что у опубликованных организаций есть public_id
            needs_update = False
            for org in orgs:
                if not org.public_id:
                    org.public_id = SyncOrm._ensure_unique_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return orgs

    @staticmethod
    def upsert_organization_for_user(
        user_id: int,
        name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        description: Optional[str] = None,
        address: Optional[str] = None,
        website: Optional[str] = None,
        ror_id: Optional[str] = None,
    ) -> models.Organization:
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user:
                raise ValueError("User not found")

            org = None
            if user.organization_id:
                org = session.get(models.Organization, user.organization_id)

            if not org:
                org = models.Organization(
                    name=name or "Организация",
                    avatar_url=avatar_url,
                    description=description,
                    address=address,
                    website=website,
                    creator_user_id=user.id,
                )
                session.add(org)
                session.flush()
                if not org.public_id:
                    org.public_id = SyncOrm._ensure_unique_public_id(session)
                user.organization_id = org.id
            else:
                if name is not None:
                    org.name = name
                if avatar_url is not None:
                    org.avatar_url = avatar_url
                if description is not None:
                    org.description = description
                if address is not None:
                    org.address = address
                if website is not None:
                    org.website = website
                if ror_id is not None:
                    org.ror_id = ror_id

            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            session.refresh(org)
            return org

    @staticmethod
    def get_organization_for_user(user_id: int) -> Optional[models.Organization]:
        with session_factory() as session:
            user = session.get(models.User, user_id)
            if not user or not user.organization_id:
                return None
            return session.get(models.Organization, user.organization_id)

    @staticmethod
    def set_organization_published(org_id: int, is_published: bool) -> Optional[models.Organization]:
        """
        Обновление флага публикации организации.
        Используется только из приватного профиля.
        """
        with session_factory() as session:
            org = session.get(models.Organization, org_id)
            if not org:
                return None
            org.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            session.refresh(org)
            return org

    @staticmethod
    def _get_labs_by_ids(
        session,
        organization_id: int,
        laboratory_ids: Optional[List[int]],
    ) -> List[models.OrganizationLaboratory]:
        if not laboratory_ids:
            return []
        stmt = select(models.OrganizationLaboratory).where(
            models.OrganizationLaboratory.organization_id == organization_id,
            models.OrganizationLaboratory.id.in_(laboratory_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_labs_by_ids_for_creator(
        session,
        creator_user_id: int,
        laboratory_ids: Optional[List[int]],
    ) -> List[models.OrganizationLaboratory]:
        if not laboratory_ids:
            return []
        stmt = select(models.OrganizationLaboratory).where(
            models.OrganizationLaboratory.creator_user_id == creator_user_id,
            models.OrganizationLaboratory.id.in_(laboratory_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_labs_by_ids_any(
        session,
        laboratory_ids: Optional[List[int]],
    ) -> List[models.OrganizationLaboratory]:
        if not laboratory_ids:
            return []
        stmt = select(models.OrganizationLaboratory).where(
            models.OrganizationLaboratory.id.in_(laboratory_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_employees_by_ids(
        session,
        organization_id: int,
        employee_ids: Optional[List[int]],
    ) -> List[models.Employee]:
        if not employee_ids:
            return []
        stmt = select(models.Employee).where(
            models.Employee.organization_id == organization_id,
            models.Employee.id.in_(employee_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_equipment_by_ids(
        session,
        organization_id: int,
        equipment_ids: Optional[List[int]],
    ) -> List[models.OrganizationEquipment]:
        if not equipment_ids:
            return []
        stmt = select(models.OrganizationEquipment).where(
            models.OrganizationEquipment.organization_id == organization_id,
            models.OrganizationEquipment.id.in_(equipment_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_task_solutions_by_ids(
        session,
        organization_id: int,
        task_solution_ids: Optional[List[int]],
    ) -> List[models.OrganizationTaskSolution]:
        if not task_solution_ids:
            return []
        stmt = select(models.OrganizationTaskSolution).where(
            models.OrganizationTaskSolution.organization_id == organization_id,
            models.OrganizationTaskSolution.id.in_(task_solution_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_employees_by_ids_for_creator(
        session,
        creator_user_id: int,
        employee_ids: Optional[List[int]],
    ) -> List[models.Employee]:
        if not employee_ids:
            return []
        stmt = select(models.Employee).where(
            models.Employee.creator_user_id == creator_user_id,
            models.Employee.id.in_(employee_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_equipment_by_ids_for_creator(
        session,
        creator_user_id: int,
        equipment_ids: Optional[List[int]],
    ) -> List[models.OrganizationEquipment]:
        if not equipment_ids:
            return []
        stmt = select(models.OrganizationEquipment).where(
            models.OrganizationEquipment.creator_user_id == creator_user_id,
            models.OrganizationEquipment.id.in_(equipment_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def _get_task_solutions_by_ids_for_creator(
        session,
        creator_user_id: int,
        task_solution_ids: Optional[List[int]],
    ) -> List[models.OrganizationTaskSolution]:
        if not task_solution_ids:
            return []
        stmt = select(models.OrganizationTaskSolution).where(
            models.OrganizationTaskSolution.creator_user_id == creator_user_id,
            models.OrganizationTaskSolution.id.in_(task_solution_ids),
        )
        return list(session.scalars(stmt).all())

    # =============================
    #        EMPLOYEES (ORG)
    # =============================

    @staticmethod
    def list_employees_for_org(organization_id: int) -> List[models.Employee]:
        with session_factory() as session:
            stmt = (
                select(models.Employee)
                .options(selectinload(models.Employee.laboratories))
                .where(models.Employee.organization_id == organization_id)
                .order_by(models.Employee.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_employees_for_creator(creator_user_id: int) -> List[models.Employee]:
        with session_factory() as session:
            stmt = (
                select(models.Employee)
                .options(selectinload(models.Employee.laboratories))
                .where(models.Employee.creator_user_id == creator_user_id)
                .order_by(models.Employee.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def get_employee(employee_id: int, organization_id: int) -> Optional[models.Employee]:
        with session_factory() as session:
            stmt = (
                select(models.Employee)
                .options(selectinload(models.Employee.laboratories))
                .where(
                    models.Employee.id == employee_id,
                    models.Employee.organization_id == organization_id,
                )
            )
            return session.scalars(stmt).first()

    @staticmethod
    def get_employee_for_creator(employee_id: int, creator_user_id: int) -> Optional[models.Employee]:
        with session_factory() as session:
            stmt = (
                select(models.Employee)
                .options(selectinload(models.Employee.laboratories))
                .where(
                    models.Employee.id == employee_id,
                    models.Employee.creator_user_id == creator_user_id,
                )
            )
            return session.scalars(stmt).first()

    @staticmethod
    def create_employee_for_org(
        organization_id: Optional[int],
        full_name: str,
        creator_user_id: Optional[int] = None,
        positions: Optional[List[str]] = None,
        academic_degree: Optional[str] = None,
        photo_url: Optional[str] = None,
        research_interests: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        publications: Optional[List[dict]] = None,
        hindex_wos: Optional[int] = None,
        hindex_scopus: Optional[int] = None,
        hindex_rsci: Optional[int] = None,
        hindex_openalex: Optional[int] = None,
        contacts: Optional[dict] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> models.Employee:
        with session_factory() as session:
            employee = models.Employee(
                organization_id=organization_id,
                creator_user_id=creator_user_id,
                full_name=full_name,
                position=positions or [],
                academic_degree=academic_degree,
                photo_url=photo_url,
                research_interests=research_interests or [],
                education=education or [],
                publications=publications or [],
                hindex_wos=hindex_wos,
                hindex_scopus=hindex_scopus,
                hindex_rsci=hindex_rsci,
                hindex_openalex=hindex_openalex,
                contacts=contacts or {},
            )
            if laboratory_ids is not None:
                if organization_id is not None:
                    employee.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
                elif creator_user_id is not None:
                    employee.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                        session, creator_user_id, laboratory_ids
                    )
            session.add(employee)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = select(models.Employee).options(selectinload(models.Employee.laboratories)).where(
                models.Employee.id == employee.id
            )
            return session.scalars(stmt).first()

    @staticmethod
    def update_employee(
        employee_id: int,
        organization_id: int,
        full_name: Optional[str] = None,
        positions: Optional[List[str]] = None,
        academic_degree: Optional[str] = None,
        photo_url: Optional[str] = None,
        research_interests: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        publications: Optional[List[dict]] = None,
        hindex_wos: Optional[int] = None,
        hindex_scopus: Optional[int] = None,
        hindex_rsci: Optional[int] = None,
        hindex_openalex: Optional[int] = None,
        contacts: Optional[dict] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.Employee]:
        with session_factory() as session:
            stmt = select(models.Employee).where(
                models.Employee.id == employee_id,
                models.Employee.organization_id == organization_id,
            )
            employee = session.scalars(stmt).first()
            if not employee:
                return None
            if full_name is not None:
                employee.full_name = full_name
            if positions is not None:
                employee.position = positions
            if academic_degree is not None:
                employee.academic_degree = academic_degree
            if photo_url is not None:
                employee.photo_url = photo_url
            if research_interests is not None:
                employee.research_interests = research_interests
            if education is not None:
                employee.education = education
            if publications is not None:
                employee.publications = publications
            if hindex_wos is not None:
                employee.hindex_wos = hindex_wos
            if hindex_scopus is not None:
                employee.hindex_scopus = hindex_scopus
            if hindex_rsci is not None:
                employee.hindex_rsci = hindex_rsci
            if hindex_openalex is not None:
                employee.hindex_openalex = hindex_openalex
            if contacts is not None:
                employee.contacts = contacts
            if laboratory_ids is not None:
                employee.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = select(models.Employee).options(selectinload(models.Employee.laboratories)).where(
                models.Employee.id == employee.id
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_employee(employee_id: int, organization_id: int) -> bool:
        with session_factory() as session:
            stmt = (
                select(models.Employee)
                .options(selectinload(models.Employee.laboratories))
                .where(
                    models.Employee.id == employee_id,
                    models.Employee.organization_id == organization_id,
                )
            )
            employee = session.scalars(stmt).first()
            if not employee:
                return False
            lab_names = []
            user_id_to_notify = employee.user_id
            if user_id_to_notify:
                researcher = session.scalars(
                    select(models.Researcher).where(models.Researcher.user_id == user_id_to_notify)
                ).first()
                if researcher:
                    for lab in (employee.laboratories or []):
                        session.execute(
                            delete(models.researcher_laboratories).where(
                                models.researcher_laboratories.c.researcher_id == researcher.id,
                                models.researcher_laboratories.c.laboratory_id == lab.id,
                            )
                        )
                        req = session.scalars(
                            select(models.LabJoinRequest).where(
                                models.LabJoinRequest.researcher_id == researcher.id,
                                models.LabJoinRequest.laboratory_id == lab.id,
                                models.LabJoinRequest.status == "approved",
                            )
                        ).first()
                        if req:
                            req.status = "removed"
                        lab_names.append(lab.name or "Лаборатория")
            session.delete(employee)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            if user_id_to_notify and lab_names:
                CoreSyncOrm.create_notification(
                    user_id_to_notify,
                    "lab_join_removed",
                    {"lab_names": lab_names},
                )
            return True

    @staticmethod
    def update_employee_for_creator(
        employee_id: int,
        creator_user_id: int,
        full_name: Optional[str] = None,
        positions: Optional[List[str]] = None,
        academic_degree: Optional[str] = None,
        photo_url: Optional[str] = None,
        research_interests: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        publications: Optional[List[dict]] = None,
        hindex_wos: Optional[int] = None,
        hindex_scopus: Optional[int] = None,
        hindex_rsci: Optional[int] = None,
        hindex_openalex: Optional[int] = None,
        contacts: Optional[dict] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.Employee]:
        with session_factory() as session:
            stmt = select(models.Employee).where(
                models.Employee.id == employee_id,
                models.Employee.creator_user_id == creator_user_id,
            )
            employee = session.scalars(stmt).first()
            if not employee:
                return None
            if full_name is not None:
                employee.full_name = full_name
            if positions is not None:
                employee.position = positions
            if academic_degree is not None:
                employee.academic_degree = academic_degree
            if photo_url is not None:
                employee.photo_url = photo_url
            if research_interests is not None:
                employee.research_interests = research_interests
            if education is not None:
                employee.education = education
            if publications is not None:
                employee.publications = publications
            if hindex_wos is not None:
                employee.hindex_wos = hindex_wos
            if hindex_scopus is not None:
                employee.hindex_scopus = hindex_scopus
            if hindex_rsci is not None:
                employee.hindex_rsci = hindex_rsci
            if hindex_openalex is not None:
                employee.hindex_openalex = hindex_openalex
            if contacts is not None:
                employee.contacts = contacts
            if laboratory_ids is not None:
                employee.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                    session, creator_user_id, laboratory_ids
                )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = select(models.Employee).options(selectinload(models.Employee.laboratories)).where(
                models.Employee.id == employee.id
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_employee_for_creator(employee_id: int, creator_user_id: int) -> bool:
        with session_factory() as session:
            stmt = (
                select(models.Employee)
                .options(selectinload(models.Employee.laboratories))
                .where(
                    models.Employee.id == employee_id,
                    models.Employee.creator_user_id == creator_user_id,
                )
            )
            employee = session.scalars(stmt).first()
            if not employee:
                return False
            lab_names = []
            user_id_to_notify = employee.user_id
            if user_id_to_notify:
                researcher = session.scalars(
                    select(models.Researcher).where(models.Researcher.user_id == user_id_to_notify)
                ).first()
                if researcher:
                    for lab in (employee.laboratories or []):
                        session.execute(
                            delete(models.researcher_laboratories).where(
                                models.researcher_laboratories.c.researcher_id == researcher.id,
                                models.researcher_laboratories.c.laboratory_id == lab.id,
                            )
                        )
                        req = session.scalars(
                            select(models.LabJoinRequest).where(
                                models.LabJoinRequest.researcher_id == researcher.id,
                                models.LabJoinRequest.laboratory_id == lab.id,
                                models.LabJoinRequest.status == "approved",
                            )
                        ).first()
                        if req:
                            req.status = "removed"
                        lab_names.append(lab.name or "Лаборатория")
            session.delete(employee)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            if user_id_to_notify and lab_names:
                CoreSyncOrm.create_notification(
                    user_id_to_notify,
                    "lab_join_removed",
                    {"lab_names": lab_names},
                )
            return True

    # =============================
    #   EQUIPMENT (ORG PROFILE)
    # =============================

    @staticmethod
    def list_equipment_for_org(organization_id: int) -> List[models.OrganizationEquipment]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationEquipment)
                .options(selectinload(models.OrganizationEquipment.laboratories))
                .where(models.OrganizationEquipment.organization_id == organization_id)
                .order_by(models.OrganizationEquipment.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_equipment_for_creator(creator_user_id: int) -> List[models.OrganizationEquipment]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationEquipment)
                .options(selectinload(models.OrganizationEquipment.laboratories))
                .where(models.OrganizationEquipment.creator_user_id == creator_user_id)
                .order_by(models.OrganizationEquipment.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def create_equipment_for_org(
        organization_id: Optional[int],
        name: str,
        creator_user_id: Optional[int] = None,
        description: Optional[str] = None,
        characteristics: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> models.OrganizationEquipment:
        with session_factory() as session:
            equipment = models.OrganizationEquipment(
                organization_id=organization_id,
                creator_user_id=creator_user_id,
                name=name,
                description=description,
                characteristics=characteristics,
                image_urls=image_urls or [],
            )
            if laboratory_ids is not None:
                if organization_id is not None:
                    equipment.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
                elif creator_user_id is not None:
                    equipment.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                        session, creator_user_id, laboratory_ids
                    )
            session.add(equipment)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Вернём экземпляр с предзагруженными лабораториями,
            # чтобы FastAPI не пытался лениво догружать их вне сессии.
            stmt = (
                select(models.OrganizationEquipment)
                .options(selectinload(models.OrganizationEquipment.laboratories))
                .where(models.OrganizationEquipment.id == equipment.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def update_equipment(
        equipment_id: int,
        organization_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        characteristics: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationEquipment]:
        with session_factory() as session:
            stmt = select(models.OrganizationEquipment).where(
                models.OrganizationEquipment.id == equipment_id,
                models.OrganizationEquipment.organization_id == organization_id,
            )
            equipment = session.scalars(stmt).first()
            if not equipment:
                return None
            if name is not None:
                equipment.name = name
            if description is not None:
                equipment.description = description
            if characteristics is not None:
                equipment.characteristics = characteristics
            if image_urls is not None:
                equipment.image_urls = image_urls
            if laboratory_ids is not None:
                equipment.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Возвращаем с предзагруженными лабораториями
            stmt = (
                select(models.OrganizationEquipment)
                .options(selectinload(models.OrganizationEquipment.laboratories))
                .where(models.OrganizationEquipment.id == equipment.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_equipment(equipment_id: int, organization_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.OrganizationEquipment).where(
                models.OrganizationEquipment.id == equipment_id,
                models.OrganizationEquipment.organization_id == organization_id,
            )
            equipment = session.scalars(stmt).first()
            if not equipment:
                return False
            session.delete(equipment)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    @staticmethod
    def update_equipment_for_creator(
        equipment_id: int,
        creator_user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        characteristics: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationEquipment]:
        with session_factory() as session:
            stmt = select(models.OrganizationEquipment).where(
                models.OrganizationEquipment.id == equipment_id,
                models.OrganizationEquipment.creator_user_id == creator_user_id,
            )
            equipment = session.scalars(stmt).first()
            if not equipment:
                return None
            if name is not None:
                equipment.name = name
            if description is not None:
                equipment.description = description
            if characteristics is not None:
                equipment.characteristics = characteristics
            if image_urls is not None:
                equipment.image_urls = image_urls
            if laboratory_ids is not None:
                equipment.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                    session, creator_user_id, laboratory_ids
                )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationEquipment)
                .options(selectinload(models.OrganizationEquipment.laboratories))
                .where(models.OrganizationEquipment.id == equipment.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_equipment_for_creator(equipment_id: int, creator_user_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.OrganizationEquipment).where(
                models.OrganizationEquipment.id == equipment_id,
                models.OrganizationEquipment.creator_user_id == creator_user_id,
            )
            equipment = session.scalars(stmt).first()
            if not equipment:
                return False
            session.delete(equipment)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    # =============================
    #   LABORATORIES (ORG PROFILE)
    # =============================

    @staticmethod
    def list_laboratories_for_org(organization_id: int) -> List[models.OrganizationLaboratory]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.organization_id == organization_id)
                .order_by(models.OrganizationLaboratory.id.desc())
            )
            labs = list(session.scalars(stmt).all())
            # Гарантируем, что у лабораторий есть public_id
            needs_update = False
            for lab in labs:
                if not lab.public_id:
                    lab.public_id = SyncOrm._ensure_unique_lab_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return labs

    @staticmethod
    def list_laboratories_for_creator(creator_user_id: int) -> List[models.OrganizationLaboratory]:
        """Лаборатории, созданные пользователем (представитель лаборатории). Включает и те, что в организации."""
        with session_factory() as session:
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.creator_user_id == creator_user_id)
                .order_by(models.OrganizationLaboratory.id.desc())
            )
            labs = list(session.scalars(stmt).all())
            needs_update = False
            for lab in labs:
                if not lab.public_id:
                    lab.public_id = SyncOrm._ensure_unique_lab_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return labs

    @staticmethod
    def list_published_laboratories_for_org(organization_id: int) -> List[models.OrganizationLaboratory]:
        """
        Публичный список лабораторий организации (только опубликованные).
        """
        with session_factory() as session:
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(
                    models.OrganizationLaboratory.organization_id == organization_id,
                    models.OrganizationLaboratory.is_published.is_(True),
                )
                .order_by(models.OrganizationLaboratory.id.desc())
            )
            labs = list(session.scalars(stmt).all())
            # Гарантируем, что у опубликованных лабораторий есть public_id
            needs_update = False
            for lab in labs:
                if not lab.public_id:
                    lab.public_id = SyncOrm._ensure_unique_lab_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return labs

    @staticmethod
    def list_published_laboratories() -> List[models.OrganizationLaboratory]:
        """
        Публичный список всех опубликованных лабораторий (для каталога).
        """
        with session_factory() as session:
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.is_published.is_(True))
                .order_by(models.OrganizationLaboratory.id.desc())
            )
            labs = list(session.scalars(stmt).all())
            # Гарантируем, что у опубликованных лабораторий есть public_id
            needs_update = False
            for lab in labs:
                if not lab.public_id:
                    lab.public_id = SyncOrm._ensure_unique_lab_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return labs

    @staticmethod
    def get_laboratory_by_public_id(public_id: str) -> Optional[models.OrganizationLaboratory]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees).selectinload(
                        models.Employee.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.public_id == public_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def create_laboratory_for_org(
        organization_id: Optional[int],
        name: str,
        creator_user_id: Optional[int] = None,
        description: Optional[str] = None,
        activities: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        employee_ids: Optional[List[int]] = None,
        head_employee_id: Optional[int] = None,
        equipment_ids: Optional[List[int]] = None,
        task_solution_ids: Optional[List[int]] = None,
    ) -> models.OrganizationLaboratory:
        with session_factory() as session:
            lab = models.OrganizationLaboratory(
                organization_id=organization_id,
                creator_user_id=creator_user_id,
                name=name,
                description=description,
                activities=activities,
                image_urls=image_urls or [],
            )
            session.add(lab)
            session.flush()
            if not lab.public_id:
                lab.public_id = SyncOrm._ensure_unique_lab_public_id(session)
            eids = list(employee_ids) if employee_ids is not None else []
            if head_employee_id is not None:
                lab.head_employee_id = head_employee_id
                if head_employee_id not in eids:
                    eids = list(set(eids) | {head_employee_id})
            if employee_ids is not None or head_employee_id is not None:
                if organization_id is not None:
                    lab.employees = SyncOrm._get_employees_by_ids(session, organization_id, eids)
                elif creator_user_id is not None:
                    lab.employees = SyncOrm._get_employees_by_ids_for_creator(
                        session, creator_user_id, eids
                    )
                else:
                    lab.employees = []
            if equipment_ids is not None:
                if organization_id is not None:
                    lab.equipment = SyncOrm._get_equipment_by_ids(session, organization_id, equipment_ids)
                elif creator_user_id is not None:
                    lab.equipment = SyncOrm._get_equipment_by_ids_for_creator(
                        session, creator_user_id, equipment_ids
                    )
                else:
                    lab.equipment = []
            if task_solution_ids is not None:
                if organization_id is not None:
                    lab.task_solutions = SyncOrm._get_task_solutions_by_ids(
                        session, organization_id, task_solution_ids
                    )
                elif creator_user_id is not None:
                    lab.task_solutions = SyncOrm._get_task_solutions_by_ids_for_creator(
                        session, creator_user_id, task_solution_ids
                    )
                else:
                    lab.task_solutions = []
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Вернём лабораторию с предзагруженными сотрудниками, оборудованием и задачами
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.id == lab.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def update_laboratory(
        laboratory_id: int,
        organization_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        activities: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        employee_ids: Optional[List[int]] = None,
        head_employee_id: Optional[int] = None,
        equipment_ids: Optional[List[int]] = None,
        task_solution_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationLaboratory]:
        with session_factory() as session:
            stmt = select(models.OrganizationLaboratory).where(
                models.OrganizationLaboratory.id == laboratory_id,
                models.OrganizationLaboratory.organization_id == organization_id,
            )
            lab = session.scalars(stmt).first()
            if not lab:
                return None
            if name is not None:
                lab.name = name
            if description is not None:
                lab.description = description
            if activities is not None:
                lab.activities = activities
            if image_urls is not None:
                lab.image_urls = image_urls
            if employee_ids is not None or head_employee_id is not None:
                eids = list(employee_ids) if employee_ids is not None else [e.id for e in lab.employees]
                if head_employee_id is not None:
                    lab.head_employee_id = head_employee_id
                    if head_employee_id not in eids:
                        eids = list(set(eids) | {head_employee_id})
                else:
                    lab.head_employee_id = None
                lab.employees = SyncOrm._get_employees_by_ids(session, organization_id, eids)
            if equipment_ids is not None:
                lab.equipment = SyncOrm._get_equipment_by_ids(session, organization_id, equipment_ids)
            if task_solution_ids is not None:
                lab.task_solutions = SyncOrm._get_task_solutions_by_ids(
                    session, organization_id, task_solution_ids
                )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Возвращаем с предзагруженными сотрудниками, оборудованием и задачами
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.id == laboratory_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def update_laboratory_for_creator(
        laboratory_id: int,
        creator_user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        activities: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        employee_ids: Optional[List[int]] = None,
        head_employee_id: Optional[int] = None,
        equipment_ids: Optional[List[int]] = None,
        task_solution_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationLaboratory]:
        with session_factory() as session:
            stmt = select(models.OrganizationLaboratory).where(
                models.OrganizationLaboratory.id == laboratory_id,
                models.OrganizationLaboratory.creator_user_id == creator_user_id,
            )
            lab = session.scalars(stmt).first()
            if not lab:
                return None
            if name is not None:
                lab.name = name
            if description is not None:
                lab.description = description
            if activities is not None:
                lab.activities = activities
            if image_urls is not None:
                lab.image_urls = image_urls
            if employee_ids is not None or head_employee_id is not None:
                eids = list(employee_ids) if employee_ids is not None else [e.id for e in lab.employees]
                if head_employee_id is not None:
                    lab.head_employee_id = head_employee_id
                    if head_employee_id not in eids:
                        eids = list(set(eids) | {head_employee_id})
                else:
                    lab.head_employee_id = None
                lab.employees = SyncOrm._get_employees_by_ids_for_creator(
                    session, creator_user_id, eids
                )
            if equipment_ids is not None:
                lab.equipment = SyncOrm._get_equipment_by_ids_for_creator(
                    session, creator_user_id, equipment_ids
                )
            if task_solution_ids is not None:
                lab.task_solutions = SyncOrm._get_task_solutions_by_ids_for_creator(
                    session, creator_user_id, task_solution_ids
                )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationLaboratory.id == laboratory_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def set_laboratory_published(
        laboratory_id: int,
        organization_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationLaboratory]:
        """
        Обновление флага публикации лаборатории.
        """
        with session_factory() as session:
            base_stmt = select(models.OrganizationLaboratory).where(
                models.OrganizationLaboratory.id == laboratory_id,
                models.OrganizationLaboratory.organization_id == organization_id,
            )
            lab = session.scalars(base_stmt).first()
            if not lab:
                return None
            lab.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Вернём лабораторию с предзагруженными сотрудниками и оборудованием,
            # чтобы FastAPI не пытался лениво догружать их вне сессии.
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(
                    models.OrganizationLaboratory.id == laboratory_id,
                    models.OrganizationLaboratory.organization_id == organization_id,
                )
            )
            return session.scalars(stmt).first()

    @staticmethod
    def set_laboratory_published_for_creator(
        laboratory_id: int,
        creator_user_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationLaboratory]:
        with session_factory() as session:
            base_stmt = select(models.OrganizationLaboratory).where(
                models.OrganizationLaboratory.id == laboratory_id,
                models.OrganizationLaboratory.creator_user_id == creator_user_id,
            )
            lab = session.scalars(base_stmt).first()
            if not lab:
                return None
            lab.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.organization),
                    selectinload(models.OrganizationLaboratory.head_employee),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.researchers),
                    selectinload(models.OrganizationLaboratory.equipment).selectinload(
                        models.OrganizationEquipment.laboratories
                    ),
                    selectinload(models.OrganizationLaboratory.task_solutions).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(
                    models.OrganizationLaboratory.id == laboratory_id,
                    models.OrganizationLaboratory.creator_user_id == creator_user_id,
                )
            )
            return session.scalars(stmt).first()

    @staticmethod
    def _unlink_lab_from_org(session, lab) -> None:
        """Отвязать лабораторию и связанные сущности от организации (organization_id = None)."""
        lab.organization_id = None
        for item in (lab.equipment or []):
            item.organization_id = None
        for item in (lab.employees or []):
            item.organization_id = None
        for item in (lab.task_solutions or []):
            item.organization_id = None
        for item in (lab.queries or []):
            item.organization_id = None
        vacs = session.scalars(
            select(models.VacancyOrganization).where(
                models.VacancyOrganization.laboratory_id == lab.id
            )
        ).all()
        for v in vacs:
            v.organization_id = None

    @staticmethod
    def delete_laboratory(laboratory_id: int, organization_id: int) -> bool:
        """Удаление лаборатории из организации: отвязка, а не полное удаление."""
        with session_factory() as session:
            lab = session.scalars(
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.equipment),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.task_solutions),
                    selectinload(models.OrganizationLaboratory.queries),
                )
                .where(
                    models.OrganizationLaboratory.id == laboratory_id,
                    models.OrganizationLaboratory.organization_id == organization_id,
                )
            ).first()
            if not lab:
                return False
            SyncOrm._unlink_lab_from_org(session, lab)
            req = session.scalars(
                select(models.OrgJoinRequest).where(
                    models.OrgJoinRequest.laboratory_id == laboratory_id,
                    models.OrgJoinRequest.organization_id == organization_id,
                    models.OrgJoinRequest.status == "approved",
                )
            ).first()
            if req:
                req.status = "left"
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    @staticmethod
    def delete_laboratory_for_creator(laboratory_id: int, creator_user_id: int) -> bool:
        """Удаление лаборатории: если в организации — отвязка; иначе — полное удаление."""
        with session_factory() as session:
            lab = session.scalars(
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.equipment),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.task_solutions),
                    selectinload(models.OrganizationLaboratory.queries),
                )
                .where(
                    models.OrganizationLaboratory.id == laboratory_id,
                    models.OrganizationLaboratory.creator_user_id == creator_user_id,
                )
            ).first()
            if not lab:
                return False
            if lab.organization_id is not None:
                SyncOrm._unlink_lab_from_org(session, lab)
            else:
                session.delete(lab)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    # =============================
    #   TASK SOLUTIONS (ORG)
    # =============================

    @staticmethod
    def list_task_solutions_for_org(organization_id: int) -> List[models.OrganizationTaskSolution]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationTaskSolution)
                .options(selectinload(models.OrganizationTaskSolution.laboratories))
                .where(models.OrganizationTaskSolution.organization_id == organization_id)
                .order_by(models.OrganizationTaskSolution.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_task_solutions_for_creator(
        creator_user_id: int,
    ) -> List[models.OrganizationTaskSolution]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationTaskSolution)
                .options(selectinload(models.OrganizationTaskSolution.laboratories))
                .where(models.OrganizationTaskSolution.creator_user_id == creator_user_id)
                .order_by(models.OrganizationTaskSolution.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def create_task_solution_for_org(
        organization_id: Optional[int],
        title: str,
        creator_user_id: Optional[int] = None,
        task_description: Optional[str] = None,
        solution_description: Optional[str] = None,
        article_links: Optional[List[str]] = None,
        solution_deadline: Optional[str] = None,
        grant_info: Optional[str] = None,
        cost: Optional[str] = None,
        external_solutions: Optional[str] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> models.OrganizationTaskSolution:
        with session_factory() as session:
            task = models.OrganizationTaskSolution(
                organization_id=organization_id,
                creator_user_id=creator_user_id,
                title=title,
                task_description=task_description,
                solution_description=solution_description,
                article_links=article_links or [],
                solution_deadline=solution_deadline,
                grant_info=grant_info,
                cost=cost,
                external_solutions=external_solutions,
            )
            session.add(task)
            if laboratory_ids is not None:
                if organization_id is not None:
                    task.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
                elif creator_user_id is not None:
                    task.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                        session, creator_user_id, laboratory_ids
                    )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationTaskSolution)
                .options(selectinload(models.OrganizationTaskSolution.laboratories))
                .where(models.OrganizationTaskSolution.id == task.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def update_task_solution(
        task_id: int,
        organization_id: int,
        title: Optional[str] = None,
        task_description: Optional[str] = None,
        solution_description: Optional[str] = None,
        article_links: Optional[List[str]] = None,
        solution_deadline: Optional[str] = None,
        grant_info: Optional[str] = None,
        cost: Optional[str] = None,
        external_solutions: Optional[str] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationTaskSolution]:
        with session_factory() as session:
            stmt = select(models.OrganizationTaskSolution).where(
                models.OrganizationTaskSolution.id == task_id,
                models.OrganizationTaskSolution.organization_id == organization_id,
            )
            task = session.scalars(stmt).first()
            if not task:
                return None
            if title is not None:
                task.title = title
            if task_description is not None:
                task.task_description = task_description
            if solution_description is not None:
                task.solution_description = solution_description
            if article_links is not None:
                task.article_links = article_links
            if solution_deadline is not None:
                task.solution_deadline = solution_deadline
            if grant_info is not None:
                task.grant_info = grant_info
            if cost is not None:
                task.cost = cost
            if external_solutions is not None:
                task.external_solutions = external_solutions
            if laboratory_ids is not None:
                task.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationTaskSolution)
                .options(selectinload(models.OrganizationTaskSolution.laboratories))
                .where(models.OrganizationTaskSolution.id == task.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_task_solution(task_id: int, organization_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.OrganizationTaskSolution).where(
                models.OrganizationTaskSolution.id == task_id,
                models.OrganizationTaskSolution.organization_id == organization_id,
            )
            task = session.scalars(stmt).first()
            if not task:
                return False
            session.delete(task)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    @staticmethod
    def update_task_solution_for_creator(
        task_id: int,
        creator_user_id: int,
        title: Optional[str] = None,
        task_description: Optional[str] = None,
        solution_description: Optional[str] = None,
        article_links: Optional[List[str]] = None,
        solution_deadline: Optional[str] = None,
        grant_info: Optional[str] = None,
        cost: Optional[str] = None,
        external_solutions: Optional[str] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationTaskSolution]:
        with session_factory() as session:
            stmt = select(models.OrganizationTaskSolution).where(
                models.OrganizationTaskSolution.id == task_id,
                models.OrganizationTaskSolution.creator_user_id == creator_user_id,
            )
            task = session.scalars(stmt).first()
            if not task:
                return None
            if title is not None:
                task.title = title
            if task_description is not None:
                task.task_description = task_description
            if solution_description is not None:
                task.solution_description = solution_description
            if article_links is not None:
                task.article_links = article_links
            if solution_deadline is not None:
                task.solution_deadline = solution_deadline
            if grant_info is not None:
                task.grant_info = grant_info
            if cost is not None:
                task.cost = cost
            if external_solutions is not None:
                task.external_solutions = external_solutions
            if laboratory_ids is not None:
                task.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                    session, creator_user_id, laboratory_ids
                )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationTaskSolution)
                .options(selectinload(models.OrganizationTaskSolution.laboratories))
                .where(models.OrganizationTaskSolution.id == task.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_task_solution_for_creator(task_id: int, creator_user_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.OrganizationTaskSolution).where(
                models.OrganizationTaskSolution.id == task_id,
                models.OrganizationTaskSolution.creator_user_id == creator_user_id,
            )
            task = session.scalars(stmt).first()
            if not task:
                return False
            session.delete(task)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    # =============================
    #        QUERIES (ORG)
    # =============================

    @staticmethod
    def list_queries_for_org(organization_id: int) -> List[models.OrganizationQuery]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.organization_id == organization_id)
                .order_by(models.OrganizationQuery.id.desc())
            )
            queries = list(session.scalars(stmt).all())
            # Гарантируем, что у запросов есть public_id
            needs_update = False
            for query in queries:
                if not query.public_id:
                    query.public_id = SyncOrm._ensure_unique_query_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return queries

    @staticmethod
    def list_queries_for_creator(creator_user_id: int) -> List[models.OrganizationQuery]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.creator_user_id == creator_user_id)
                .order_by(models.OrganizationQuery.id.desc())
            )
            queries = list(session.scalars(stmt).all())
            needs_update = False
            for query in queries:
                if not query.public_id:
                    query.public_id = SyncOrm._ensure_unique_query_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return queries

    @staticmethod
    def list_published_queries_for_org(organization_id: int) -> List[models.OrganizationQuery]:
        """
        Публичный список запросов организации (только опубликованные).
        """
        with session_factory() as session:
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(
                    models.OrganizationQuery.organization_id == organization_id,
                    models.OrganizationQuery.is_published.is_(True),
                )
                .order_by(models.OrganizationQuery.id.desc())
            )
            queries = list(session.scalars(stmt).all())
            # Гарантируем, что у опубликованных запросов есть public_id
            needs_update = False
            for query in queries:
                if not query.public_id:
                    query.public_id = SyncOrm._ensure_unique_query_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            return queries

    @staticmethod
    def list_published_queries() -> List[models.OrganizationQuery]:
        """
        Публичный список всех опубликованных запросов (для отдельной страницы).
        """
        with session_factory() as session:
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.organization),
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    # для каждой вакансии заранее подгружаем лабораторию, контакт, организацию и запрос
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.is_published.is_(True))
                .order_by(models.OrganizationQuery.id.desc())
            )
            queries = list(session.scalars(stmt).all())
            # Гарантируем, что у опубликованных запросов есть public_id
            needs_update = False
            for query in queries:
                if not query.public_id:
                    query.public_id = SyncOrm._ensure_unique_query_public_id(session)
                    needs_update = True
            if needs_update:
                try:
                    session.commit()
                except SQLAlchemyError:
                    session.rollback()
            # Загружаем vacancies в рамках сессии, чтобы избежать lazy load после её закрытия
            for query in queries:
                _ = list(query.vacancies or [])
            return queries

    @staticmethod
    def get_query_by_public_id(public_id: str) -> Optional[models.OrganizationQuery]:
        with session_factory() as session:
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.organization),
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees).selectinload(
                        models.Employee.laboratories
                    ),
                    # Заранее подгружаем лабораторию, контакт, организацию и запрос для каждой вакансии
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.public_id == public_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def create_query_for_org(
        organization_id: Optional[int],
        title: str,
        creator_user_id: Optional[int] = None,
        task_description: Optional[str] = None,
        completed_examples: Optional[str] = None,
        grant_info: Optional[str] = None,
        budget: Optional[str] = None,
        deadline: Optional[str] = None,
        status: Optional[str] = None,
        linked_task_solution_id: Optional[int] = None,
        laboratory_ids: Optional[List[int]] = None,
        employee_ids: Optional[List[int]] = None,
    ) -> models.OrganizationQuery:
        with session_factory() as session:
            query = models.OrganizationQuery(
                organization_id=organization_id,
                creator_user_id=creator_user_id,
                title=title,
                task_description=task_description,
                completed_examples=completed_examples,
                grant_info=grant_info,
                budget=budget,
                deadline=deadline,
                linked_task_solution_id=linked_task_solution_id,
            )
            if status is not None:
                query.status = status
            if organization_id is not None:
                query.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
                query.employees = SyncOrm._get_employees_by_ids(session, organization_id, employee_ids)
            elif creator_user_id is not None:
                query.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                    session, creator_user_id, laboratory_ids
                )
                query.employees = SyncOrm._get_employees_by_ids_for_creator(
                    session, creator_user_id, employee_ids
                )
            session.add(query)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.id == query.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def update_query(
        query_id: int,
        organization_id: int,
        title: Optional[str] = None,
        task_description: Optional[str] = None,
        completed_examples: Optional[str] = None,
        grant_info: Optional[str] = None,
        budget: Optional[str] = None,
        deadline: Optional[str] = None,
        status: Optional[str] = None,
        linked_task_solution_id: Optional[int] = None,
        laboratory_ids: Optional[List[int]] = None,
        employee_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationQuery]:
        with session_factory() as session:
            stmt = select(models.OrganizationQuery).where(
                models.OrganizationQuery.id == query_id,
                models.OrganizationQuery.organization_id == organization_id,
            )
            query = session.scalars(stmt).first()
            if not query:
                return None
            if title is not None:
                query.title = title
            if task_description is not None:
                query.task_description = task_description
            if completed_examples is not None:
                query.completed_examples = completed_examples
            if grant_info is not None:
                query.grant_info = grant_info
            if budget is not None:
                query.budget = budget
            if deadline is not None:
                query.deadline = deadline
            if status is not None:
                query.status = status
            if linked_task_solution_id is not None:
                query.linked_task_solution_id = linked_task_solution_id
            if laboratory_ids is not None:
                query.laboratories = SyncOrm._get_labs_by_ids(session, organization_id, laboratory_ids)
            if employee_ids is not None:
                query.employees = SyncOrm._get_employees_by_ids(session, organization_id, employee_ids)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.id == query.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def set_query_published(
        query_id: int,
        organization_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationQuery]:
        """
        Обновление флага публикации запроса организации.
        """
        with session_factory() as session:
            stmt = select(models.OrganizationQuery).where(
                models.OrganizationQuery.id == query_id,
                models.OrganizationQuery.organization_id == organization_id,
            )
            query = session.scalars(stmt).first()
            if not query:
                return None
            query.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.id == query.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_query(query_id: int, organization_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.OrganizationQuery).where(
                models.OrganizationQuery.id == query_id,
                models.OrganizationQuery.organization_id == organization_id,
            )
            query = session.scalars(stmt).first()
            if not query:
                return False
            session.delete(query)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    @staticmethod
    def update_query_for_creator(
        query_id: int,
        creator_user_id: int,
        title: Optional[str] = None,
        task_description: Optional[str] = None,
        completed_examples: Optional[str] = None,
        grant_info: Optional[str] = None,
        budget: Optional[str] = None,
        deadline: Optional[str] = None,
        status: Optional[str] = None,
        linked_task_solution_id: Optional[int] = None,
        laboratory_ids: Optional[List[int]] = None,
        employee_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationQuery]:
        with session_factory() as session:
            stmt = select(models.OrganizationQuery).where(
                models.OrganizationQuery.id == query_id,
                models.OrganizationQuery.creator_user_id == creator_user_id,
            )
            query = session.scalars(stmt).first()
            if not query:
                return None
            if title is not None:
                query.title = title
            if task_description is not None:
                query.task_description = task_description
            if completed_examples is not None:
                query.completed_examples = completed_examples
            if grant_info is not None:
                query.grant_info = grant_info
            if budget is not None:
                query.budget = budget
            if deadline is not None:
                query.deadline = deadline
            if status is not None:
                query.status = status
            if linked_task_solution_id is not None:
                query.linked_task_solution_id = linked_task_solution_id
            if laboratory_ids is not None:
                query.laboratories = SyncOrm._get_labs_by_ids_for_creator(
                    session, creator_user_id, laboratory_ids
                )
            if employee_ids is not None:
                query.employees = SyncOrm._get_employees_by_ids_for_creator(
                    session, creator_user_id, employee_ids
                )
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.id == query.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def set_query_published_for_creator(
        query_id: int,
        creator_user_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationQuery]:
        with session_factory() as session:
            stmt = select(models.OrganizationQuery).where(
                models.OrganizationQuery.id == query_id,
                models.OrganizationQuery.creator_user_id == creator_user_id,
            )
            query = session.scalars(stmt).first()
            if not query:
                return None
            query.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.OrganizationQuery)
                .options(
                    selectinload(models.OrganizationQuery.laboratories),
                    selectinload(models.OrganizationQuery.employees),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.laboratory
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.contact_employee
                    ).selectinload(models.Employee.laboratories),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.organization
                    ),
                    selectinload(models.OrganizationQuery.vacancies).selectinload(
                        models.VacancyOrganization.query
                    ),
                    selectinload(models.OrganizationQuery.linked_task_solution).selectinload(
                        models.OrganizationTaskSolution.laboratories
                    ),
                )
                .where(models.OrganizationQuery.id == query.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_query_for_creator(query_id: int, creator_user_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.OrganizationQuery).where(
                models.OrganizationQuery.id == query_id,
                models.OrganizationQuery.creator_user_id == creator_user_id,
            )
            query = session.scalars(stmt).first()
            if not query:
                return False
            session.delete(query)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    # =============================
    #      VACANCIES (ORG)
    # =============================

    @staticmethod
    def create_vacancy(
        organization_id: Optional[int],
        name: str,
        creator_user_id: Optional[int] = None,
        requirements: Optional[str] = None,
        description: Optional[str] = None,
        employment_type: Optional[str] = None,
        query_id: Optional[int] = None,
        laboratory_id: Optional[int] = None,
        contact_employee_id: Optional[int] = None,
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
    ) -> models.VacancyOrganization:
        with session_factory() as session:
            vacancy = models.VacancyOrganization(
                organization_id=organization_id,
                creator_user_id=creator_user_id,
                query_id=query_id,
                laboratory_id=laboratory_id,
                contact_employee_id=contact_employee_id,
                contact_email=contact_email,
                contact_phone=contact_phone,
                name=name,
                requirements=requirements,
                description=description,
                employment_type=employment_type,
            )
            session.add(vacancy)
            session.flush()
            if not vacancy.public_id:
                vacancy.public_id = SyncOrm._ensure_unique_vacancy_public_id(session)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Вернём экземпляр с предзагруженными связями, чтобы FastAPI
            # не пытался лениво догружать их вне сессии.
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.id == vacancy.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def get_vacancy(vacancy_id: int) -> Optional[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.id == vacancy_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def get_vacancy_by_public_id(public_id: str) -> Optional[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.public_id == public_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def list_vacancies() -> List[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .order_by(models.VacancyOrganization.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_vacancies_for_org(organization_id: int) -> List[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization).options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.organization_id == organization_id)
                .order_by(models.VacancyOrganization.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_vacancies_for_creator(creator_user_id: int) -> List[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization).options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.creator_user_id == creator_user_id)
                .order_by(models.VacancyOrganization.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_published_vacancies() -> List[models.VacancyOrganization]:
        """
        Публичный список вакансий (для главной страницы и каталога).
        """
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.is_published.is_(True))
                .order_by(models.VacancyOrganization.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_published_vacancies_for_org(organization_id: int) -> List[models.VacancyOrganization]:
        """
        Публичный список вакансий конкретной организации.
        """
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(
                    models.VacancyOrganization.organization_id == organization_id,
                    models.VacancyOrganization.is_published.is_(True),
                )
                .order_by(models.VacancyOrganization.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def list_published_vacancies_for_laboratory(laboratory_id: int) -> List[models.VacancyOrganization]:
        """
        Публичный список опубликованных вакансий, привязанных к данной лаборатории.
        """
        with session_factory() as session:
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(
                    models.VacancyOrganization.laboratory_id == laboratory_id,
                    models.VacancyOrganization.is_published.is_(True),
                )
                .order_by(models.VacancyOrganization.id.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def update_vacancy(
        vacancy_id: int,
        organization_id: int,
        name: Optional[str] = None,
        requirements: Optional[str] = None,
        description: Optional[str] = None,
        employment_type: Optional[str] = None,
        query_id: Optional[int] = None,
        laboratory_id: Optional[int] = None,
        contact_employee_id: Optional[int] = None,
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
        patch: Optional[dict] = None,
    ) -> Optional[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = select(models.VacancyOrganization).where(
                models.VacancyOrganization.id == vacancy_id,
                models.VacancyOrganization.organization_id == organization_id,
            )
            vacancy = session.scalars(stmt).first()
            if not vacancy:
                return None
            if name is not None:
                vacancy.name = name
            if requirements is not None:
                vacancy.requirements = requirements
            if description is not None:
                vacancy.description = description
            if employment_type is not None:
                vacancy.employment_type = employment_type
            if query_id is not None:
                vacancy.query_id = query_id
            if laboratory_id is not None:
                vacancy.laboratory_id = laboratory_id
            if contact_employee_id is not None:
                vacancy.contact_employee_id = contact_employee_id
            if contact_email is not None:
                vacancy.contact_email = contact_email
            if contact_phone is not None:
                vacancy.contact_phone = contact_phone
            if patch:
                for key in ("query_id", "laboratory_id", "contact_employee_id", "contact_email", "contact_phone"):
                    if key in patch:
                        setattr(vacancy, key, patch[key])
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.id == vacancy.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def set_vacancy_published(
        vacancy_id: int,
        organization_id: int,
        is_published: bool,
    ) -> Optional[models.VacancyOrganization]:
        """
        Обновление флага публикации вакансии.
        """
        with session_factory() as session:
            stmt = select(models.VacancyOrganization).where(
                models.VacancyOrganization.id == vacancy_id,
                models.VacancyOrganization.organization_id == organization_id,
            )
            vacancy = session.scalars(stmt).first()
            if not vacancy:
                return None
            vacancy.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            # Вернём вакансию с предзагруженными связями
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.id == vacancy_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_vacancy(vacancy_id: int, organization_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.VacancyOrganization).where(
                models.VacancyOrganization.id == vacancy_id,
                models.VacancyOrganization.organization_id == organization_id,
            )
            vacancy = session.scalars(stmt).first()
            if not vacancy:
                return False
            session.delete(vacancy)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    @staticmethod
    def update_vacancy_for_creator(
        vacancy_id: int,
        creator_user_id: int,
        name: Optional[str] = None,
        requirements: Optional[str] = None,
        description: Optional[str] = None,
        employment_type: Optional[str] = None,
        query_id: Optional[int] = None,
        laboratory_id: Optional[int] = None,
        contact_employee_id: Optional[int] = None,
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
        patch: Optional[dict] = None,
    ) -> Optional[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = select(models.VacancyOrganization).where(
                models.VacancyOrganization.id == vacancy_id,
                models.VacancyOrganization.creator_user_id == creator_user_id,
            )
            vacancy = session.scalars(stmt).first()
            if not vacancy:
                return None
            if name is not None:
                vacancy.name = name
            if requirements is not None:
                vacancy.requirements = requirements
            if description is not None:
                vacancy.description = description
            if employment_type is not None:
                vacancy.employment_type = employment_type
            if query_id is not None:
                vacancy.query_id = query_id
            if laboratory_id is not None:
                vacancy.laboratory_id = laboratory_id
            if contact_employee_id is not None:
                vacancy.contact_employee_id = contact_employee_id
            if contact_email is not None:
                vacancy.contact_email = contact_email
            if contact_phone is not None:
                vacancy.contact_phone = contact_phone
            if patch:
                for key in ("query_id", "laboratory_id", "contact_employee_id", "contact_email", "contact_phone"):
                    if key in patch:
                        setattr(vacancy, key, patch[key])
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.id == vacancy.id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def set_vacancy_published_for_creator(
        vacancy_id: int,
        creator_user_id: int,
        is_published: bool,
    ) -> Optional[models.VacancyOrganization]:
        with session_factory() as session:
            stmt = select(models.VacancyOrganization).where(
                models.VacancyOrganization.id == vacancy_id,
                models.VacancyOrganization.creator_user_id == creator_user_id,
            )
            vacancy = session.scalars(stmt).first()
            if not vacancy:
                return None
            vacancy.is_published = bool(is_published)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            stmt = (
                select(models.VacancyOrganization)
                .options(
                    selectinload(models.VacancyOrganization.organization),
                    selectinload(models.VacancyOrganization.query),
                    selectinload(models.VacancyOrganization.laboratory),
                    selectinload(models.VacancyOrganization.contact_employee).selectinload(
                        models.Employee.laboratories
                    ),
                )
                .where(models.VacancyOrganization.id == vacancy_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def delete_vacancy_for_creator(vacancy_id: int, creator_user_id: int) -> bool:
        with session_factory() as session:
            stmt = select(models.VacancyOrganization).where(
                models.VacancyOrganization.id == vacancy_id,
                models.VacancyOrganization.creator_user_id == creator_user_id,
            )
            vacancy = session.scalars(stmt).first()
            if not vacancy:
                return False
            session.delete(vacancy)
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            return True

    # =========================
    #   VACANCY RESPONSES
    # =========================

    @staticmethod
    def create_vacancy_response(user_id: int, vacancy_id: int) -> models.VacancyResponse:
        with session_factory() as session:
            vacancy = session.get(
                models.VacancyOrganization,
                vacancy_id,
                options=[selectinload(models.VacancyOrganization.creator)],
            )
            if not vacancy:
                raise ValueError("Вакансия не найдена")
            if not getattr(vacancy, "is_published", False):
                raise ValueError("Вакансия не опубликована")
            if vacancy.creator_user_id == user_id:
                raise ValueError("Нельзя откликнуться на свою вакансию")
            existing = session.scalars(
                select(models.VacancyResponse).where(
                    models.VacancyResponse.user_id == user_id,
                    models.VacancyResponse.vacancy_id == vacancy_id,
                )
            ).first()
            if existing:
                raise ValueError("Вы уже откликнулись на эту вакансию")
            resp = models.VacancyResponse(user_id=user_id, vacancy_id=vacancy_id, status="new")
            session.add(resp)
            try:
                session.commit()
                session.refresh(resp)
            except SQLAlchemyError:
                session.rollback()
                raise
            return resp

    @staticmethod
    def get_my_response_for_vacancy(user_id: int, vacancy_id: int) -> Optional[models.VacancyResponse]:
        with session_factory() as session:
            stmt = select(models.VacancyResponse).where(
                models.VacancyResponse.user_id == user_id,
                models.VacancyResponse.vacancy_id == vacancy_id,
            )
            return session.scalars(stmt).first()

    @staticmethod
    def list_vacancy_responses_for_employer(creator_user_id: int) -> List[dict]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyResponse)
                .options(
                    selectinload(models.VacancyResponse.user),
                    selectinload(models.VacancyResponse.vacancy),
                )
                .join(models.VacancyOrganization, models.VacancyResponse.vacancy_id == models.VacancyOrganization.id)
                .where(models.VacancyOrganization.creator_user_id == creator_user_id)
                .order_by(models.VacancyResponse.created_at.desc())
            )
            rows = list(session.scalars(stmt).unique().all())
            out = []
            for r in rows:
                applicant_name = getattr(r.user, "full_name", None) or getattr(r.user, "mail", "") or "?"
                preview_parts = []
                researcher = ResearcherSyncOrm.get_researcher_by_user(r.user_id)
                if researcher:
                    if getattr(researcher, "research_interests", None):
                        preview_parts.append("Направления: " + ", ".join((researcher.research_interests or [])[:3]))
                    if getattr(researcher, "education", None) and isinstance(researcher.education, list):
                        preview_parts.append("Образование: " + (researcher.education[0].get("institution", "") if researcher.education else ""))
                else:
                    student = StudentSyncOrm.get_student_by_user(r.user_id)
                    if student:
                        preview_parts.append("Студент")
                        if getattr(student, "direction", None):
                            preview_parts.append(student.direction or "")
                applicant_preview = "; ".join(preview_parts) if preview_parts else None
                out.append({
                    "id": r.id,
                    "user_id": r.user_id,
                    "vacancy_id": r.vacancy_id,
                    "status": r.status,
                    "created_at": r.created_at,
                    "updated_at": r.updated_at,
                    "vacancy_name": r.vacancy.name if r.vacancy else None,
                    "vacancy_public_id": getattr(r.vacancy, "public_id", None) if r.vacancy else None,
                    "applicant_name": applicant_name,
                    "applicant_preview": applicant_preview or None,
                })
            return out

    @staticmethod
    def list_my_vacancy_responses(user_id: int) -> List[dict]:
        with session_factory() as session:
            stmt = (
                select(models.VacancyResponse)
                .options(selectinload(models.VacancyResponse.vacancy))
                .where(models.VacancyResponse.user_id == user_id)
                .order_by(models.VacancyResponse.created_at.desc())
            )
            rows = list(session.scalars(stmt).unique().all())
            return [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "vacancy_id": r.vacancy_id,
                    "status": r.status,
                    "created_at": r.created_at,
                    "updated_at": r.updated_at,
                    "vacancy_name": r.vacancy.name if r.vacancy else None,
                    "vacancy_public_id": getattr(r.vacancy, "public_id", None) if r.vacancy else None,
                    "applicant_name": None,
                    "applicant_preview": None,
                }
                for r in rows
            ]

    @staticmethod
    def update_vacancy_response_status(
        response_id: int, employer_user_id: int, status: str
    ) -> Optional[dict]:
        allowed = ("new", "accepted", "rejected")
        if status not in allowed:
            return None
        with session_factory() as session:
            stmt = (
                select(models.VacancyResponse)
                .options(
                    selectinload(models.VacancyResponse.user),
                    selectinload(models.VacancyResponse.vacancy),
                )
                .where(models.VacancyResponse.id == response_id)
                .join(models.VacancyOrganization, models.VacancyResponse.vacancy_id == models.VacancyOrganization.id)
                .where(models.VacancyOrganization.creator_user_id == employer_user_id)
            )
            resp = session.scalars(stmt).unique().first()
            if not resp:
                return None
            resp.status = status
            try:
                session.commit()
                session.refresh(resp)
            except SQLAlchemyError:
                session.rollback()
                raise
            applicant_name = getattr(resp.user, "full_name", None) or getattr(resp.user, "mail", "") or "?"
            return {
                "id": resp.id,
                "user_id": resp.user_id,
                "vacancy_id": resp.vacancy_id,
                "status": resp.status,
                "created_at": resp.created_at,
                "updated_at": resp.updated_at,
                "vacancy_name": resp.vacancy.name if resp.vacancy else None,
                "vacancy_public_id": getattr(resp.vacancy, "public_id", None) if resp.vacancy else None,
                "applicant_name": applicant_name,
                "applicant_preview": None,
            }

    @staticmethod
    def count_platform_stats() -> dict:
        """Счётчики для главной страницы: лаборатории, вакансии, организации, интересы сотрудников."""
        with session_factory() as session:
            labs_count = session.scalar(
                select(func.count()).select_from(models.OrganizationLaboratory).where(
                    models.OrganizationLaboratory.is_published.is_(True)
                )
            ) or 0
            vac_count = session.scalar(
                select(func.count()).select_from(models.VacancyOrganization).where(
                    models.VacancyOrganization.is_published.is_(True)
                )
            ) or 0
            orgs_count = session.scalar(
                select(func.count()).select_from(models.Organization).where(
                    models.Organization.is_published.is_(True)
                )
            ) or 0
            rows = session.scalars(
                select(models.Employee.research_interests).where(
                    models.Employee.research_interests.isnot(None)
                )
            ).all()
            seen = set()
            interests = []
            for ri in rows:
                if not ri or not isinstance(ri, (list, tuple)):
                    continue
            for item in ri:
                if isinstance(item, str) and item.strip() and item.strip() not in seen:
                    seen.add(item.strip())
                    interests.append(item.strip())
            responses_count = session.scalar(
                select(func.count()).select_from(models.VacancyResponse)
            ) or 0
            return {
                "laboratories": labs_count,
                "vacancies": vac_count,
                "organizations": orgs_count,
                "responses": responses_count,
                "research_interests": interests,
            }

    # =============================
    #   LAB JOIN REQUESTS
    # =============================

    @staticmethod
    def create_lab_join_request(researcher_id: int, laboratory_id: int) -> models.LabJoinRequest:
        with session_factory() as session:
            existing = session.scalars(
                select(models.LabJoinRequest).where(
                    models.LabJoinRequest.researcher_id == researcher_id,
                    models.LabJoinRequest.laboratory_id == laboratory_id,
                )
            ).first()
            if existing:
                if existing.status == "approved":
                    raise ValueError("Вы уже являетесь участником этой лаборатории")
                if existing.status == "pending":
                    raise ValueError("Заявка в эту лабораторию уже отправлена и ожидает рассмотрения")
                existing.status = "pending"
                session.commit()
                session.refresh(existing)
                return existing
            req = models.LabJoinRequest(
                researcher_id=researcher_id,
                laboratory_id=laboratory_id,
                status="pending",
            )
            session.add(req)
            session.commit()
            session.refresh(req)
            return req

    @staticmethod
    def get_lab_join_requests_for_researcher(researcher_id: int) -> List[models.LabJoinRequest]:
        with session_factory() as session:
            stmt = (
                select(models.LabJoinRequest)
                .options(
                    selectinload(models.LabJoinRequest.laboratory),
                )
                .where(models.LabJoinRequest.researcher_id == researcher_id)
                .order_by(models.LabJoinRequest.created_at.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def leave_laboratory(researcher_id: int, laboratory_id: int) -> bool:
        with session_factory() as session:
            result = session.execute(
                delete(models.researcher_laboratories).where(
                    models.researcher_laboratories.c.researcher_id == researcher_id,
                    models.researcher_laboratories.c.laboratory_id == laboratory_id,
                )
            )
            if result.rowcount > 0:
                # Удаляем также из employee_laboratories (сотрудник покидает лабораторию)
                researcher = session.get(models.Researcher, researcher_id)
                lab = session.get(models.OrganizationLaboratory, laboratory_id)
                if researcher and lab:
                    stmt = select(models.Employee).where(
                        models.Employee.user_id == researcher.user_id,
                    )
                    if lab.organization_id is not None:
                        stmt = stmt.where(models.Employee.organization_id == lab.organization_id)
                    else:
                        stmt = stmt.where(
                            models.Employee.organization_id.is_(None),
                            models.Employee.creator_user_id == lab.creator_user_id,
                        )
                    employee = session.scalars(stmt).first()
                    if employee and lab in employee.laboratories:
                        employee.laboratories.remove(lab)
                session.commit()
                return True
            # Строка не найдена — возможно, approve не добавил её (старая ошибка).
            stmt = select(models.LabJoinRequest).where(
                models.LabJoinRequest.researcher_id == researcher_id,
                models.LabJoinRequest.laboratory_id == laboratory_id,
                models.LabJoinRequest.status == "approved",
            )
            req = session.scalars(stmt).first()
            if req:
                req.status = "left"
                session.commit()
                return True
            return False

    @staticmethod
    def get_lab_join_requests_for_org(organization_id: int) -> List[models.LabJoinRequest]:
        with session_factory() as session:
            stmt = (
                select(models.LabJoinRequest)
                .options(
                    selectinload(models.LabJoinRequest.researcher),
                    selectinload(models.LabJoinRequest.laboratory),
                )
                .join(models.OrganizationLaboratory)
                .where(
                    models.OrganizationLaboratory.organization_id == organization_id,
                    models.LabJoinRequest.status == "pending",
                )
                .order_by(models.LabJoinRequest.created_at.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def get_lab_join_requests_for_creator(creator_user_id: int) -> List[models.LabJoinRequest]:
        with session_factory() as session:
            stmt = (
                select(models.LabJoinRequest)
                .options(
                    selectinload(models.LabJoinRequest.researcher),
                    selectinload(models.LabJoinRequest.laboratory),
                )
                .join(models.OrganizationLaboratory)
                .where(
                    models.OrganizationLaboratory.creator_user_id == creator_user_id,
                    models.LabJoinRequest.status == "pending",
                )
                .order_by(models.LabJoinRequest.created_at.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def _ensure_employee_from_researcher_in_lab(session, researcher, lab) -> None:
        """Создаёт или находит Employee из Researcher и добавляет в лабораторию (сотрудники/профиль)."""
        org_id = lab.organization_id
        creator_id = lab.creator_user_id
        stmt = select(models.Employee).where(models.Employee.user_id == researcher.user_id)
        if org_id is not None:
            stmt = stmt.where(models.Employee.organization_id == org_id)
        else:
            stmt = stmt.where(
                models.Employee.organization_id.is_(None),
                models.Employee.creator_user_id == creator_id,
            )
        employee = session.scalars(stmt).first()
        if employee:
            if lab not in employee.laboratories:
                employee.laboratories.append(lab)
        else:
            employee = models.Employee(
                organization_id=org_id,
                creator_user_id=creator_id if org_id is None else None,
                user_id=researcher.user_id,
                full_name=researcher.full_name,
                position=researcher.position or [],
                academic_degree=researcher.academic_degree,
                photo_url=researcher.photo_url,
                research_interests=researcher.research_interests or [],
                education=researcher.education or [],
                publications=researcher.publications or [],
                hindex_wos=researcher.hindex_wos,
                hindex_scopus=researcher.hindex_scopus,
                hindex_rsci=researcher.hindex_rsci,
                hindex_openalex=researcher.hindex_openalex,
                contacts=researcher.contacts or {},
            )
            session.add(employee)
            session.flush()
            employee.laboratories.append(lab)

    @staticmethod
    def approve_lab_join_request(request_id: int) -> Optional[models.LabJoinRequest]:
        with session_factory() as session:
            req = session.get(models.LabJoinRequest, request_id)
            if not req or req.status != "pending":
                return None
            researcher = session.get(models.Researcher, req.researcher_id)
            lab = session.get(models.OrganizationLaboratory, req.laboratory_id)
            if not researcher or not lab:
                return None
            # researcher_laboratories — связь Исследователь↔Лаборатория
            session.execute(
                pg_insert(models.researcher_laboratories)
                .values(researcher_id=req.researcher_id, laboratory_id=req.laboratory_id)
                .on_conflict_do_nothing(index_elements=["researcher_id", "laboratory_id"])
            )
            # Employee — для отображения в сотрудниках лаборатории/организации и редактирования в профиле
            SyncOrm._ensure_employee_from_researcher_in_lab(session, researcher, lab)
            req.status = "approved"
            session.commit()
            session.refresh(req)
            return req

    @staticmethod
    def reject_lab_join_request(request_id: int) -> Optional[models.LabJoinRequest]:
        with session_factory() as session:
            req = session.get(models.LabJoinRequest, request_id)
            if not req or req.status != "pending":
                return None
            req.status = "rejected"
            session.commit()
            session.refresh(req)
            return req

    @staticmethod
    def get_lab_join_request_by_id(request_id: int) -> Optional[models.LabJoinRequest]:
        with session_factory() as session:
            stmt = (
                select(models.LabJoinRequest)
                .options(
                    selectinload(models.LabJoinRequest.researcher),
                    selectinload(models.LabJoinRequest.laboratory),
                )
                .where(models.LabJoinRequest.id == request_id)
            )
            return session.scalars(stmt).first()

    # =============================
    #   ORG JOIN REQUESTS
    # =============================

    @staticmethod
    def create_org_join_request(laboratory_id: int, organization_id: int) -> models.OrgJoinRequest:
        with session_factory() as session:
            existing = session.scalars(
                select(models.OrgJoinRequest).where(
                    models.OrgJoinRequest.laboratory_id == laboratory_id,
                    models.OrgJoinRequest.organization_id == organization_id,
                )
            ).first()
            if existing:
                if existing.status == "approved":
                    raise ValueError("Лаборатория уже привязана к этой организации")
                if existing.status == "pending":
                    raise ValueError("Заявка на привязку к этой организации уже отправлена и ожидает рассмотрения")
                existing.status = "pending"
                session.commit()
                session.refresh(existing)
                return existing
            req = models.OrgJoinRequest(
                laboratory_id=laboratory_id,
                organization_id=organization_id,
                status="pending",
            )
            session.add(req)
            session.commit()
            session.refresh(req)
            return req

    @staticmethod
    def get_org_join_requests_for_researcher_or_lab_rep(user_id: int) -> List[models.OrgJoinRequest]:
        """Org join requests for labs created by this user (lab_rep)."""
        with session_factory() as session:
            stmt = (
                select(models.OrgJoinRequest)
                .options(
                    selectinload(models.OrgJoinRequest.laboratory),
                    selectinload(models.OrgJoinRequest.organization),
                )
                .join(models.OrganizationLaboratory)
                .where(models.OrganizationLaboratory.creator_user_id == user_id)
                .order_by(models.OrgJoinRequest.created_at.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def get_org_join_requests_for_org(organization_id: int) -> List[models.OrgJoinRequest]:
        with session_factory() as session:
            stmt = (
                select(models.OrgJoinRequest)
                .options(
                    selectinload(models.OrgJoinRequest.laboratory),
                    selectinload(models.OrgJoinRequest.organization),
                )
                .where(
                    models.OrgJoinRequest.organization_id == organization_id,
                    models.OrgJoinRequest.status == "pending",
                )
                .order_by(models.OrgJoinRequest.created_at.desc())
            )
            return list(session.scalars(stmt).all())

    @staticmethod
    def approve_org_join_request(request_id: int) -> Optional[models.OrgJoinRequest]:
        with session_factory() as session:
            req = session.get(models.OrgJoinRequest, request_id)
            if not req or req.status != "pending":
                return None
            lab = session.scalars(
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.equipment),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.task_solutions),
                    selectinload(models.OrganizationLaboratory.queries),
                )
                .where(models.OrganizationLaboratory.id == req.laboratory_id)
            ).first()
            org = session.get(models.Organization, req.organization_id)
            if not lab or not org:
                return None
            lab.organization_id = org.id
            for item in lab.equipment or []:
                item.organization_id = org.id
            for item in lab.employees or []:
                item.organization_id = org.id
            for item in lab.task_solutions or []:
                item.organization_id = org.id
            for item in lab.queries or []:
                item.organization_id = org.id
            vacs = session.scalars(
                select(models.VacancyOrganization).where(
                    models.VacancyOrganization.laboratory_id == lab.id
                )
            ).all()
            for v in vacs:
                v.organization_id = org.id
            req.status = "approved"
            session.commit()
            session.refresh(req)
            return req

    @staticmethod
    def reject_org_join_request(request_id: int) -> Optional[models.OrgJoinRequest]:
        with session_factory() as session:
            req = session.get(models.OrgJoinRequest, request_id)
            if not req or req.status != "pending":
                return None
            req.status = "rejected"
            session.commit()
            session.refresh(req)
            return req

    @staticmethod
    def leave_organization(request_id: int, creator_user_id: int) -> Optional[dict]:
        """
        Лаборатория покидает организацию. Возвращает {lab_name, org_id} для уведомления или None.
        """
        with session_factory() as session:
            req = session.get(models.OrgJoinRequest, request_id)
            if not req or req.status != "approved":
                return None
            lab = session.scalars(
                select(models.OrganizationLaboratory)
                .options(
                    selectinload(models.OrganizationLaboratory.equipment),
                    selectinload(models.OrganizationLaboratory.employees),
                    selectinload(models.OrganizationLaboratory.task_solutions),
                    selectinload(models.OrganizationLaboratory.queries),
                )
                .where(models.OrganizationLaboratory.id == req.laboratory_id)
            ).first()
            org = session.get(models.Organization, req.organization_id)
            if not lab or not org or lab.creator_user_id != creator_user_id:
                return None
            lab.organization_id = None
            for item in lab.equipment or []:
                item.organization_id = None
            for item in lab.employees or []:
                item.organization_id = None
            for item in lab.task_solutions or []:
                item.organization_id = None
            for item in lab.queries or []:
                item.organization_id = None
            vacs = session.scalars(
                select(models.VacancyOrganization).where(
                    models.VacancyOrganization.laboratory_id == lab.id
                )
            ).all()
            for v in vacs:
                v.organization_id = None
            req.status = "left"
            session.commit()
            return {"lab_name": lab.name or "", "org_id": org.id, "org_name": org.name or ""}

    @staticmethod
    def get_org_join_request_by_id(request_id: int) -> Optional[models.OrgJoinRequest]:
        with session_factory() as session:
            stmt = (
                select(models.OrgJoinRequest)
                .options(
                    selectinload(models.OrgJoinRequest.laboratory),
                    selectinload(models.OrgJoinRequest.organization),
                )
                .where(models.OrgJoinRequest.id == request_id)
            )
            return session.scalars(stmt).first()