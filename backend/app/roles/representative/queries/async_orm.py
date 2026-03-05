"""
AsyncOrm — асинхронная обёртка над SyncOrm для домена организаций.
"""

import asyncio
from typing import List, Optional, Tuple

from app import models
from app.roles.representative.queries.sync_orm import SyncOrm


class AsyncOrm:
    # =============================
    #        ORGANIZATIONS
    # =============================
    @staticmethod
    async def create_organization(
        name: str,
        avatar_url: Optional[str] = None,
        description: Optional[str] = None,
        address: Optional[str] = None,
        website: Optional[str] = None,
    ) -> models.Organization:
        return await asyncio.to_thread(
            SyncOrm.create_organization,
            name,
            avatar_url,
            description,
            address,
            website,
        )

    @staticmethod
    async def get_organization(org_id: int) -> Optional[models.Organization]:
        return await asyncio.to_thread(SyncOrm.get_organization, org_id)

    @staticmethod
    async def get_organization_by_public_id(public_id: str) -> Optional[models.Organization]:
        return await asyncio.to_thread(SyncOrm.get_organization_by_public_id, public_id)

    @staticmethod
    async def update_organization_ror(organization_id: int, ror_id: Optional[str]) -> models.Organization:
        return await asyncio.to_thread(SyncOrm.update_organization_ror, organization_id, ror_id)

    @staticmethod
    async def get_organizations_with_ror() -> List[models.Organization]:
        return await asyncio.to_thread(SyncOrm.get_organizations_with_ror)

    @staticmethod
    async def list_organizations() -> List[models.Organization]:
        return await asyncio.to_thread(SyncOrm.list_organizations)

    @staticmethod
    async def list_published_organizations() -> List[models.Organization]:
        return await asyncio.to_thread(SyncOrm.list_published_organizations)

    @staticmethod
    async def get_organizations_by_ids(org_ids: list) -> list:
        return await asyncio.to_thread(SyncOrm.get_organizations_by_ids, org_ids)

    @staticmethod
    async def upsert_organization_for_user(
        user_id: int,
        name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        description: Optional[str] = None,
        address: Optional[str] = None,
        website: Optional[str] = None,
        ror_id: Optional[str] = None,
    ) -> models.Organization:
        return await asyncio.to_thread(
            SyncOrm.upsert_organization_for_user,
            user_id,
            name,
            avatar_url,
            description,
            address,
            website,
            ror_id,
        )

    @staticmethod
    async def get_organization_for_user(user_id: int) -> Optional[models.Organization]:
        return await asyncio.to_thread(SyncOrm.get_organization_for_user, user_id)

    @staticmethod
    async def get_organization_representative_user_ids(org_id: int) -> List[int]:
        return await asyncio.to_thread(
            SyncOrm.get_organization_representative_user_ids, org_id
        )

    @staticmethod
    async def set_organization_published(org_id: int, is_published: bool) -> Optional[models.Organization]:
        return await asyncio.to_thread(SyncOrm.set_organization_published, org_id, is_published)

    # =============================
    #        EMPLOYEES (ORG)
    # =============================

    @staticmethod
    async def list_employees_for_org(organization_id: int) -> List[models.Employee]:
        return await asyncio.to_thread(SyncOrm.list_employees_for_org, organization_id)

    @staticmethod
    async def list_employees_for_creator(creator_user_id: int) -> List[models.Employee]:
        return await asyncio.to_thread(SyncOrm.list_employees_for_creator, creator_user_id)

    @staticmethod
    async def get_employee(employee_id: int, organization_id: int) -> Optional[models.Employee]:
        return await asyncio.to_thread(SyncOrm.get_employee, employee_id, organization_id)

    @staticmethod
    async def get_employee_for_creator(
        employee_id: int, creator_user_id: int
    ) -> Optional[models.Employee]:
        return await asyncio.to_thread(SyncOrm.get_employee_for_creator, employee_id, creator_user_id)

    @staticmethod
    async def create_employee_for_org(
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
        return await asyncio.to_thread(
            SyncOrm.create_employee_for_org,
            organization_id=organization_id,
            full_name=full_name,
            creator_user_id=creator_user_id,
            positions=positions,
            academic_degree=academic_degree,
            photo_url=photo_url,
            research_interests=research_interests,
            education=education,
            publications=publications,
            hindex_wos=hindex_wos,
            hindex_scopus=hindex_scopus,
            hindex_rsci=hindex_rsci,
            hindex_openalex=hindex_openalex,
            contacts=contacts,
            laboratory_ids=laboratory_ids,
        )

    @staticmethod
    async def update_employee(
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
        return await asyncio.to_thread(
            SyncOrm.update_employee,
            employee_id,
            organization_id,
            full_name,
            positions,
            academic_degree,
            photo_url,
            research_interests,
            education,
            publications,
            hindex_wos,
            hindex_scopus,
            hindex_rsci,
            hindex_openalex,
            contacts,
            laboratory_ids,
        )

    @staticmethod
    async def delete_employee(employee_id: int, organization_id: int) -> tuple[bool, Optional[int], List[str]]:
        return await asyncio.to_thread(SyncOrm.delete_employee, employee_id, organization_id)

    @staticmethod
    async def update_employee_for_creator(
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
        return await asyncio.to_thread(
            SyncOrm.update_employee_for_creator,
            employee_id,
            creator_user_id,
            full_name,
            positions,
            academic_degree,
            photo_url,
            research_interests,
            education,
            publications,
            hindex_wos,
            hindex_scopus,
            hindex_rsci,
            hindex_openalex,
            contacts,
            laboratory_ids,
        )

    @staticmethod
    async def delete_employee_for_creator(employee_id: int, creator_user_id: int) -> tuple[bool, Optional[int], List[str]]:
        return await asyncio.to_thread(
            SyncOrm.delete_employee_for_creator, employee_id, creator_user_id
        )

    # =============================
    #   EQUIPMENT (ORG PROFILE)
    # =============================

    @staticmethod
    async def list_equipment_for_org(organization_id: int) -> List[models.OrganizationEquipment]:
        return await asyncio.to_thread(SyncOrm.list_equipment_for_org, organization_id)

    @staticmethod
    async def list_equipment_for_creator(
        creator_user_id: int,
    ) -> List[models.OrganizationEquipment]:
        return await asyncio.to_thread(SyncOrm.list_equipment_for_creator, creator_user_id)

    @staticmethod
    async def create_equipment_for_org(
        organization_id: Optional[int],
        name: str,
        creator_user_id: Optional[int] = None,
        description: Optional[str] = None,
        characteristics: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> models.OrganizationEquipment:
        return await asyncio.to_thread(
            SyncOrm.create_equipment_for_org,
            organization_id=organization_id,
            name=name,
            creator_user_id=creator_user_id,
            description=description,
            characteristics=characteristics,
            image_urls=image_urls,
            laboratory_ids=laboratory_ids,
        )

    @staticmethod
    async def get_equipment(equipment_id: int, organization_id: int) -> Optional[models.OrganizationEquipment]:
        return await asyncio.to_thread(SyncOrm.get_equipment, equipment_id, organization_id)

    @staticmethod
    async def get_equipment_for_creator(
        equipment_id: int, creator_user_id: int
    ) -> Optional[models.OrganizationEquipment]:
        return await asyncio.to_thread(SyncOrm.get_equipment_for_creator, equipment_id, creator_user_id)

    @staticmethod
    async def update_equipment(
        equipment_id: int,
        organization_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        characteristics: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationEquipment]:
        return await asyncio.to_thread(
            SyncOrm.update_equipment,
            equipment_id,
            organization_id,
            name,
            description,
            characteristics,
            image_urls,
            laboratory_ids,
        )

    @staticmethod
    async def delete_equipment(equipment_id: int, organization_id: int) -> bool:
        return await asyncio.to_thread(SyncOrm.delete_equipment, equipment_id, organization_id)

    @staticmethod
    async def update_equipment_for_creator(
        equipment_id: int,
        creator_user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        characteristics: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        laboratory_ids: Optional[List[int]] = None,
    ) -> Optional[models.OrganizationEquipment]:
        return await asyncio.to_thread(
            SyncOrm.update_equipment_for_creator,
            equipment_id,
            creator_user_id,
            name,
            description,
            characteristics,
            image_urls,
            laboratory_ids,
        )

    @staticmethod
    async def delete_equipment_for_creator(equipment_id: int, creator_user_id: int) -> bool:
        return await asyncio.to_thread(
            SyncOrm.delete_equipment_for_creator, equipment_id, creator_user_id
        )

    # =============================
    #   LABORATORIES (ORG PROFILE)
    # =============================

    @staticmethod
    async def list_laboratories_for_org(organization_id: int) -> List[models.OrganizationLaboratory]:
        return await asyncio.to_thread(SyncOrm.list_laboratories_for_org, organization_id)

    @staticmethod
    async def list_laboratories_for_creator(
        creator_user_id: int,
    ) -> List[models.OrganizationLaboratory]:
        return await asyncio.to_thread(SyncOrm.list_laboratories_for_creator, creator_user_id)

    @staticmethod
    async def list_published_laboratories_for_org(
        organization_id: int,
    ) -> List[models.OrganizationLaboratory]:
        return await asyncio.to_thread(SyncOrm.list_published_laboratories_for_org, organization_id)

    @staticmethod
    async def list_published_laboratories() -> List[models.OrganizationLaboratory]:
        return await asyncio.to_thread(SyncOrm.list_published_laboratories)

    @staticmethod
    async def get_laboratories_by_ids(lab_ids: list) -> list:
        return await asyncio.to_thread(SyncOrm.get_laboratories_by_ids, lab_ids)

    @staticmethod
    async def get_laboratory_by_public_id(public_id: str) -> Optional[models.OrganizationLaboratory]:
        return await asyncio.to_thread(SyncOrm.get_laboratory_by_public_id, public_id)

    @staticmethod
    async def create_laboratory_for_org(
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
        return await asyncio.to_thread(
            SyncOrm.create_laboratory_for_org,
            organization_id=organization_id,
            name=name,
            creator_user_id=creator_user_id,
            description=description,
            activities=activities,
            image_urls=image_urls,
            employee_ids=employee_ids,
            head_employee_id=head_employee_id,
            equipment_ids=equipment_ids,
            task_solution_ids=task_solution_ids,
        )

    @staticmethod
    async def update_laboratory(
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
        return await asyncio.to_thread(
            SyncOrm.update_laboratory,
            laboratory_id,
            organization_id,
            name,
            description,
            activities,
            image_urls,
            employee_ids,
            head_employee_id,
            equipment_ids,
            task_solution_ids,
        )

    @staticmethod
    async def delete_laboratory(
        laboratory_id: int, organization_id: int
    ) -> tuple[bool, Optional[int], str]:
        return await asyncio.to_thread(
            SyncOrm.delete_laboratory, laboratory_id, organization_id
        )

    @staticmethod
    async def update_laboratory_for_creator(
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
        return await asyncio.to_thread(
            SyncOrm.update_laboratory_for_creator,
            laboratory_id,
            creator_user_id,
            name,
            description,
            activities,
            image_urls,
            employee_ids,
            head_employee_id,
            equipment_ids,
            task_solution_ids,
        )

    @staticmethod
    async def set_laboratory_published_for_creator(
        laboratory_id: int,
        creator_user_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationLaboratory]:
        return await asyncio.to_thread(
            SyncOrm.set_laboratory_published_for_creator,
            laboratory_id,
            creator_user_id,
            is_published,
        )

    @staticmethod
    async def delete_laboratory_for_creator(
        laboratory_id: int, creator_user_id: int
    ) -> tuple[bool, Optional[int], str]:
        return await asyncio.to_thread(
            SyncOrm.delete_laboratory_for_creator, laboratory_id, creator_user_id
        )

    # =============================
    #   TASK SOLUTIONS (ORG)
    # =============================

    @staticmethod
    async def list_task_solutions_for_org(
        organization_id: int,
    ) -> List[models.OrganizationTaskSolution]:
        return await asyncio.to_thread(SyncOrm.list_task_solutions_for_org, organization_id)

    @staticmethod
    async def list_task_solutions_for_creator(
        creator_user_id: int,
    ) -> List[models.OrganizationTaskSolution]:
        return await asyncio.to_thread(SyncOrm.list_task_solutions_for_creator, creator_user_id)

    @staticmethod
    async def create_task_solution_for_org(
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
        return await asyncio.to_thread(
            SyncOrm.create_task_solution_for_org,
            organization_id=organization_id,
            title=title,
            creator_user_id=creator_user_id,
            task_description=task_description,
            solution_description=solution_description,
            article_links=article_links,
            solution_deadline=solution_deadline,
            grant_info=grant_info,
            cost=cost,
            external_solutions=external_solutions,
            laboratory_ids=laboratory_ids,
        )

    @staticmethod
    async def update_task_solution(
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
        return await asyncio.to_thread(
            SyncOrm.update_task_solution,
            task_id,
            organization_id,
            title,
            task_description,
            solution_description,
            article_links,
            solution_deadline,
            grant_info,
            cost,
            external_solutions,
            laboratory_ids,
        )

    @staticmethod
    async def delete_task_solution(task_id: int, organization_id: int) -> bool:
        return await asyncio.to_thread(SyncOrm.delete_task_solution, task_id, organization_id)

    @staticmethod
    async def update_task_solution_for_creator(
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
        return await asyncio.to_thread(
            SyncOrm.update_task_solution_for_creator,
            task_id,
            creator_user_id,
            title,
            task_description,
            solution_description,
            article_links,
            solution_deadline,
            grant_info,
            cost,
            external_solutions,
            laboratory_ids,
        )

    @staticmethod
    async def delete_task_solution_for_creator(task_id: int, creator_user_id: int) -> bool:
        return await asyncio.to_thread(
            SyncOrm.delete_task_solution_for_creator, task_id, creator_user_id
        )

    # =============================
    #        QUERIES (ORG)
    # =============================

    @staticmethod
    async def list_queries_for_org(organization_id: int) -> List[models.OrganizationQuery]:
        return await asyncio.to_thread(SyncOrm.list_queries_for_org, organization_id)

    @staticmethod
    async def list_queries_for_creator(
        creator_user_id: int,
    ) -> List[models.OrganizationQuery]:
        return await asyncio.to_thread(SyncOrm.list_queries_for_creator, creator_user_id)

    @staticmethod
    async def list_published_queries_for_org(organization_id: int) -> List[models.OrganizationQuery]:
        return await asyncio.to_thread(SyncOrm.list_published_queries_for_org, organization_id)

    @staticmethod
    async def list_published_queries() -> List[models.OrganizationQuery]:
        return await asyncio.to_thread(SyncOrm.list_published_queries)

    @staticmethod
    async def create_query_for_org(
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
        return await asyncio.to_thread(
            SyncOrm.create_query_for_org,
            organization_id=organization_id,
            title=title,
            creator_user_id=creator_user_id,
            task_description=task_description,
            completed_examples=completed_examples,
            grant_info=grant_info,
            budget=budget,
            deadline=deadline,
            status=status,
            linked_task_solution_id=linked_task_solution_id,
            laboratory_ids=laboratory_ids,
            employee_ids=employee_ids,
        )

    @staticmethod
    async def update_query(
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
        return await asyncio.to_thread(
            SyncOrm.update_query,
            query_id,
            organization_id,
            title,
            task_description,
            completed_examples,
            grant_info,
            budget,
            deadline,
            status,
            linked_task_solution_id,
            laboratory_ids,
            employee_ids,
        )

    @staticmethod
    async def get_query_by_public_id(public_id: str) -> Optional[models.OrganizationQuery]:
        return await asyncio.to_thread(SyncOrm.get_query_by_public_id, public_id)

    @staticmethod
    async def set_laboratory_published(
        laboratory_id: int,
        organization_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationLaboratory]:
        return await asyncio.to_thread(
            SyncOrm.set_laboratory_published,
            laboratory_id,
            organization_id,
            is_published,
        )

    @staticmethod
    async def get_query_for_org(
        query_id: int, organization_id: int
    ) -> Optional[models.OrganizationQuery]:
        return await asyncio.to_thread(
            SyncOrm.get_query_for_org, query_id, organization_id
        )

    @staticmethod
    async def get_query_for_creator(
        query_id: int, creator_user_id: int
    ) -> Optional[models.OrganizationQuery]:
        return await asyncio.to_thread(
            SyncOrm.get_query_for_creator, query_id, creator_user_id
        )

    @staticmethod
    async def set_query_published(
        query_id: int,
        organization_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationQuery]:
        return await asyncio.to_thread(
            SyncOrm.set_query_published,
            query_id,
            organization_id,
            is_published,
        )

    @staticmethod
    async def delete_query(query_id: int, organization_id: int) -> bool:
        return await asyncio.to_thread(SyncOrm.delete_query, query_id, organization_id)

    @staticmethod
    async def update_query_for_creator(
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
        return await asyncio.to_thread(
            SyncOrm.update_query_for_creator,
            query_id,
            creator_user_id,
            title,
            task_description,
            completed_examples,
            grant_info,
            budget,
            deadline,
            status,
            linked_task_solution_id,
            laboratory_ids,
            employee_ids,
        )

    @staticmethod
    async def set_query_published_for_creator(
        query_id: int,
        creator_user_id: int,
        is_published: bool,
    ) -> Optional[models.OrganizationQuery]:
        return await asyncio.to_thread(
            SyncOrm.set_query_published_for_creator,
            query_id,
            creator_user_id,
            is_published,
        )

    @staticmethod
    async def delete_query_for_creator(query_id: int, creator_user_id: int) -> bool:
        return await asyncio.to_thread(
            SyncOrm.delete_query_for_creator, query_id, creator_user_id
        )

    # =============================
    #      VACANCIES (ORG)
    # =============================
    @staticmethod
    async def create_vacancy(
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
        return await asyncio.to_thread(
            SyncOrm.create_vacancy,
            organization_id=organization_id,
            name=name,
            creator_user_id=creator_user_id,
            requirements=requirements,
            description=description,
            employment_type=employment_type,
            query_id=query_id,
            laboratory_id=laboratory_id,
            contact_employee_id=contact_employee_id,
            contact_email=contact_email,
            contact_phone=contact_phone,
        )

    @staticmethod
    async def get_vacancy(vacancy_id: int) -> Optional[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.get_vacancy, vacancy_id)

    @staticmethod
    async def get_vacancy_for_org(
        vacancy_id: int, organization_id: int
    ) -> Optional[models.VacancyOrganization]:
        return await asyncio.to_thread(
            SyncOrm.get_vacancy_for_org, vacancy_id, organization_id
        )

    @staticmethod
    async def get_vacancy_for_creator(
        vacancy_id: int, creator_user_id: int
    ) -> Optional[models.VacancyOrganization]:
        return await asyncio.to_thread(
            SyncOrm.get_vacancy_for_creator, vacancy_id, creator_user_id
        )

    @staticmethod
    async def has_published_vacancies_or_queries_for_lab(laboratory_id: int) -> bool:
        return await asyncio.to_thread(
            SyncOrm.has_published_vacancies_or_queries_for_lab, laboratory_id
        )

    @staticmethod
    async def has_published_vacancies_as_contact_for_employee(employee_id: int) -> bool:
        return await asyncio.to_thread(
            SyncOrm.has_published_vacancies_as_contact_for_employee, employee_id
        )

    @staticmethod
    async def get_vacancy_by_public_id(public_id: str) -> Optional[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.get_vacancy_by_public_id, public_id)

    @staticmethod
    async def list_vacancies() -> List[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.list_vacancies)

    @staticmethod
    async def list_published_vacancies() -> List[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.list_published_vacancies)

    @staticmethod
    async def list_vacancies_for_org(organization_id: int) -> List[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.list_vacancies_for_org, organization_id)

    @staticmethod
    async def list_vacancies_for_creator(
        creator_user_id: int,
    ) -> List[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.list_vacancies_for_creator, creator_user_id)

    @staticmethod
    async def get_vacancy_stats_for_user(user_id: int) -> list:
        return await asyncio.to_thread(SyncOrm.get_vacancy_stats_for_user, user_id)

    @staticmethod
    async def get_employer_dashboard_data(user_id: int) -> dict:
        return await asyncio.to_thread(SyncOrm.get_employer_dashboard_data, user_id)

    @staticmethod
    async def list_published_vacancies_for_org(
        organization_id: int,
    ) -> List[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.list_published_vacancies_for_org, organization_id)

    @staticmethod
    async def list_published_vacancies_for_laboratory(
        laboratory_id: int,
    ) -> List[models.VacancyOrganization]:
        return await asyncio.to_thread(SyncOrm.list_published_vacancies_for_laboratory, laboratory_id)

    @staticmethod
    async def update_vacancy(
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
        return await asyncio.to_thread(
            SyncOrm.update_vacancy,
            vacancy_id,
            organization_id,
            name,
            requirements,
            description,
            employment_type,
            query_id,
            laboratory_id,
            contact_employee_id,
            contact_email,
            contact_phone,
            patch,
        )

    @staticmethod
    async def set_vacancy_published(
        vacancy_id: int,
        organization_id: int,
        is_published: bool,
    ) -> Optional[models.VacancyOrganization]:
        return await asyncio.to_thread(
            SyncOrm.set_vacancy_published,
            vacancy_id,
            organization_id,
            is_published,
        )

    @staticmethod
    async def delete_vacancy(vacancy_id: int, organization_id: int) -> bool:
        return await asyncio.to_thread(SyncOrm.delete_vacancy, vacancy_id, organization_id)

    @staticmethod
    async def update_vacancy_for_creator(
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
        return await asyncio.to_thread(
            SyncOrm.update_vacancy_for_creator,
            vacancy_id,
            creator_user_id,
            name,
            requirements,
            description,
            employment_type,
            query_id,
            laboratory_id,
            contact_employee_id,
            contact_email,
            contact_phone,
            patch,
        )

    @staticmethod
    async def set_vacancy_published_for_creator(
        vacancy_id: int,
        creator_user_id: int,
        is_published: bool,
    ) -> Optional[models.VacancyOrganization]:
        return await asyncio.to_thread(
            SyncOrm.set_vacancy_published_for_creator,
            vacancy_id,
            creator_user_id,
            is_published,
        )

    @staticmethod
    async def delete_vacancy_for_creator(vacancy_id: int, creator_user_id: int) -> bool:
        return await asyncio.to_thread(
            SyncOrm.delete_vacancy_for_creator, vacancy_id, creator_user_id
        )

    @staticmethod
    async def create_vacancy_response(user_id: int, vacancy_id: int) -> models.VacancyResponse:
        return await asyncio.to_thread(SyncOrm.create_vacancy_response, user_id, vacancy_id)

    @staticmethod
    async def get_my_response_for_vacancy(user_id: int, vacancy_id: int):
        return await asyncio.to_thread(SyncOrm.get_my_response_for_vacancy, user_id, vacancy_id)

    @staticmethod
    async def list_vacancy_responses_for_employer(creator_user_id: int):
        return await asyncio.to_thread(SyncOrm.list_vacancy_responses_for_employer, creator_user_id)

    @staticmethod
    async def list_my_vacancy_responses(user_id: int):
        return await asyncio.to_thread(SyncOrm.list_my_vacancy_responses, user_id)

    @staticmethod
    async def update_vacancy_response_status(response_id: int, employer_user_id: int, status: str):
        return await asyncio.to_thread(
            SyncOrm.update_vacancy_response_status, response_id, employer_user_id, status
        )

    @staticmethod
    async def count_platform_stats() -> dict:
        return await asyncio.to_thread(SyncOrm.count_platform_stats)

    # =============================
    #   LAB JOIN REQUESTS
    # =============================

    @staticmethod
    async def create_lab_join_request(researcher_id: int, laboratory_id: int):
        return await asyncio.to_thread(SyncOrm.create_lab_join_request, researcher_id, laboratory_id)

    @staticmethod
    async def get_lab_join_requests_for_researcher(researcher_id: int):
        return await asyncio.to_thread(SyncOrm.get_lab_join_requests_for_researcher, researcher_id)

    @staticmethod
    async def leave_laboratory(researcher_id: int, laboratory_id: int) -> bool:
        return await asyncio.to_thread(SyncOrm.leave_laboratory, researcher_id, laboratory_id)

    @staticmethod
    async def get_lab_join_requests_for_org(organization_id: int):
        return await asyncio.to_thread(SyncOrm.get_lab_join_requests_for_org, organization_id)

    @staticmethod
    async def get_lab_join_requests_for_creator(creator_user_id: int):
        return await asyncio.to_thread(SyncOrm.get_lab_join_requests_for_creator, creator_user_id)

    @staticmethod
    async def approve_lab_join_request(request_id: int):
        return await asyncio.to_thread(SyncOrm.approve_lab_join_request, request_id)

    @staticmethod
    async def reject_lab_join_request(request_id: int):
        return await asyncio.to_thread(SyncOrm.reject_lab_join_request, request_id)

    @staticmethod
    async def get_lab_join_request_by_id(request_id: int):
        return await asyncio.to_thread(SyncOrm.get_lab_join_request_by_id, request_id)

    # =============================
    #   ORG JOIN REQUESTS
    # =============================

    @staticmethod
    async def create_org_join_request(laboratory_id: int, organization_id: int):
        return await asyncio.to_thread(SyncOrm.create_org_join_request, laboratory_id, organization_id)

    @staticmethod
    async def get_org_join_requests_for_researcher_or_lab_rep(user_id: int):
        return await asyncio.to_thread(SyncOrm.get_org_join_requests_for_researcher_or_lab_rep, user_id)

    @staticmethod
    async def get_org_join_requests_for_org(organization_id: int):
        return await asyncio.to_thread(SyncOrm.get_org_join_requests_for_org, organization_id)

    @staticmethod
    async def approve_org_join_request(request_id: int):
        return await asyncio.to_thread(SyncOrm.approve_org_join_request, request_id)

    @staticmethod
    async def reject_org_join_request(request_id: int):
        return await asyncio.to_thread(SyncOrm.reject_org_join_request, request_id)

    async def leave_organization(request_id: int, creator_user_id: int):
        return await asyncio.to_thread(SyncOrm.leave_organization, request_id, creator_user_id)

    @staticmethod
    async def get_org_join_request_by_id(request_id: int):
        return await asyncio.to_thread(SyncOrm.get_org_join_request_by_id, request_id)