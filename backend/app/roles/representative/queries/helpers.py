"""
Хелперы для representative.
Функции работают с AsyncSession.
"""

import secrets
import string
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models


def generate_public_id() -> str:
    """Генерация R-XXX-XXX-XXX, без БД."""
    alphabet = string.ascii_uppercase + string.digits

    def part(size: int) -> str:
        return "".join(secrets.choice(alphabet) for _ in range(size))

    return f"R-{part(5)}-{part(5)}-{part(5)}"


async def ensure_unique_lab_public_id(session: AsyncSession) -> str:
    """Уникальный public_id для OrganizationLaboratory."""
    while True:
        candidate = generate_public_id()
        stmt = select(models.OrganizationLaboratory).where(
            models.OrganizationLaboratory.public_id == candidate
        )
        result = await session.execute(stmt)
        if result.scalars().first() is None:
            return candidate


async def ensure_unique_query_public_id(session: AsyncSession) -> str:
    """Уникальный public_id для OrganizationQuery."""
    while True:
        candidate = generate_public_id()
        stmt = select(models.OrganizationQuery).where(
            models.OrganizationQuery.public_id == candidate
        )
        result = await session.execute(stmt)
        if result.scalars().first() is None:
            return candidate


async def ensure_unique_vacancy_public_id(session: AsyncSession) -> str:
    """Уникальный public_id для VacancyOrganization."""
    while True:
        candidate = generate_public_id()
        stmt = select(models.VacancyOrganization).where(
            models.VacancyOrganization.public_id == candidate
        )
        result = await session.execute(stmt)
        if result.scalars().first() is None:
            return candidate


async def get_employees_by_ids(
    session: AsyncSession,
    organization_id: int,
    employee_ids: Optional[List[int]],
) -> List[models.Employee]:
    if not employee_ids:
        return []
    stmt = select(models.Employee).where(
        models.Employee.organization_id == organization_id,
        models.Employee.id.in_(employee_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_employees_by_ids_for_creator(
    session: AsyncSession,
    creator_user_id: int,
    employee_ids: Optional[List[int]],
) -> List[models.Employee]:
    if not employee_ids:
        return []
    stmt = select(models.Employee).where(
        models.Employee.creator_user_id == creator_user_id,
        models.Employee.id.in_(employee_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_equipment_by_ids(
    session: AsyncSession,
    organization_id: int,
    equipment_ids: Optional[List[int]],
) -> List[models.OrganizationEquipment]:
    if not equipment_ids:
        return []
    stmt = select(models.OrganizationEquipment).where(
        models.OrganizationEquipment.organization_id == organization_id,
        models.OrganizationEquipment.id.in_(equipment_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_equipment_by_ids_for_creator(
    session: AsyncSession,
    creator_user_id: int,
    equipment_ids: Optional[List[int]],
) -> List[models.OrganizationEquipment]:
    if not equipment_ids:
        return []
    stmt = select(models.OrganizationEquipment).where(
        models.OrganizationEquipment.creator_user_id == creator_user_id,
        models.OrganizationEquipment.id.in_(equipment_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_task_solutions_by_ids(
    session: AsyncSession,
    organization_id: int,
    task_solution_ids: Optional[List[int]],
) -> List[models.OrganizationTaskSolution]:
    if not task_solution_ids:
        return []
    stmt = select(models.OrganizationTaskSolution).where(
        models.OrganizationTaskSolution.organization_id == organization_id,
        models.OrganizationTaskSolution.id.in_(task_solution_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_task_solutions_by_ids_for_creator(
    session: AsyncSession,
    creator_user_id: int,
    task_solution_ids: Optional[List[int]],
) -> List[models.OrganizationTaskSolution]:
    if not task_solution_ids:
        return []
    stmt = select(models.OrganizationTaskSolution).where(
        models.OrganizationTaskSolution.creator_user_id == creator_user_id,
        models.OrganizationTaskSolution.id.in_(task_solution_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def close_lab_join_requests_for_lab(session: AsyncSession, lab_id: int) -> None:
    """Обновляет статус заявок на «removed» и отвязывает исследователей от лаборатории."""
    stmt = select(models.LabJoinRequest).where(
        models.LabJoinRequest.laboratory_id == lab_id,
        models.LabJoinRequest.status == "approved",
    )
    result = await session.execute(stmt)
    lab_reqs = result.scalars().all()
    for req in lab_reqs:
        req.status = "removed"
    await session.execute(
        delete(models.researcher_laboratories).where(
            models.researcher_laboratories.c.laboratory_id == lab_id,
        )
    )


async def unlink_lab_from_org(
    session: AsyncSession,
    lab: models.OrganizationLaboratory,
) -> None:
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
    stmt = select(models.VacancyOrganization).where(
        models.VacancyOrganization.laboratory_id == lab.id
    )
    result = await session.execute(stmt)
    vacs = result.scalars().all()
    for v in vacs:
        v.organization_id = None


async def get_labs_by_ids(
    session: AsyncSession,
    organization_id: int,
    laboratory_ids: Optional[List[int]],
) -> List[models.OrganizationLaboratory]:
    """Загрузить лаборатории по id для организации."""
    if not laboratory_ids:
        return []
    stmt = select(models.OrganizationLaboratory).where(
        models.OrganizationLaboratory.organization_id == organization_id,
        models.OrganizationLaboratory.id.in_(laboratory_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_labs_by_ids_for_creator(
    session: AsyncSession,
    creator_user_id: int,
    laboratory_ids: Optional[List[int]],
) -> List[models.OrganizationLaboratory]:
    """Загрузить лаборатории по id для creator (lab_representative)."""
    if not laboratory_ids:
        return []
    stmt = select(models.OrganizationLaboratory).where(
        models.OrganizationLaboratory.creator_user_id == creator_user_id,
        models.OrganizationLaboratory.id.in_(laboratory_ids),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def ensure_employee_from_researcher_in_lab(
    session: AsyncSession,
    researcher: "models.Researcher",
    lab: "models.OrganizationLaboratory",
) -> None:
    """Создаёт или находит Employee из Researcher и добавляет в лабораторию (сотрудники/профиль)."""
    from sqlalchemy.orm import selectinload

    org_id = lab.organization_id
    creator_id = lab.creator_user_id
    stmt = (
        select(models.Employee)
        .options(selectinload(models.Employee.laboratories))
        .where(models.Employee.user_id == researcher.user_id)
    )
    if org_id is not None:
        stmt = stmt.where(models.Employee.organization_id == org_id)
    else:
        stmt = stmt.where(
            models.Employee.organization_id.is_(None),
            models.Employee.creator_user_id == creator_id,
        )
    result = await session.execute(stmt)
    employee = result.scalars().first()
    if employee:
        if lab not in employee.laboratories:
            employee.laboratories.append(lab)
    else:
        user = await session.get(models.User, researcher.user_id)
        photo_url = user.photo_url if user else None
        contacts = user.contacts if user and getattr(user, "contacts", None) else {}
        if not isinstance(contacts, dict):
            contacts = {}
        pos = getattr(researcher, "position", None)
        position = (
            [pos] if isinstance(pos, str) and pos.strip() else (pos if isinstance(pos, list) else [])
        )
        employee = models.Employee(
            organization_id=org_id,
            creator_user_id=creator_id if org_id is None else None,
            user_id=researcher.user_id,
            full_name=researcher.full_name,
            position=position,
            academic_degree=researcher.academic_degree,
            photo_url=photo_url,
            research_interests=researcher.research_interests or [],
            education=researcher.education or [],
            publications=researcher.publications or [],
            hindex_wos=researcher.hindex_wos,
            hindex_scopus=researcher.hindex_scopus,
            hindex_rsci=researcher.hindex_rsci,
            hindex_openalex=researcher.hindex_openalex,
            contacts=contacts,
        )
        session.add(employee)
        await session.flush()
        employee.laboratories.append(lab)
