"""
Синхронный слой работы с БД для роли исследователя.
"""

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError

from app.database import session_factory
from app import models


class SyncOrm:
    @staticmethod
    def _get_labs_by_ids(session, laboratory_ids: Optional[List[int]]):
        """Получить лаборатории по списку id (для привязки к исследователю)."""
        if not laboratory_ids:
            return []
        stmt = select(models.OrganizationLaboratory).where(
            models.OrganizationLaboratory.id.in_(laboratory_ids),
        )
        return list(session.scalars(stmt).all())

    @staticmethod
    def get_researcher_by_user(user_id: int) -> Optional[models.Researcher]:
        with session_factory() as session:
            stmt = (
                select(models.Researcher)
                .options(selectinload(models.Researcher.laboratories))
                .where(models.Researcher.user_id == user_id)
            )
            return session.scalars(stmt).first()

    @staticmethod
    def upsert_researcher_profile(
        user_id: int,
        full_name: Optional[str] = None,
        position: Optional[str] = None,
        academic_degree: Optional[str] = None,
        research_interests: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        publications: Optional[List] = None,
        hindex_wos: Optional[int] = None,
        hindex_scopus: Optional[int] = None,
        hindex_rsci: Optional[int] = None,
        hindex_openalex: Optional[int] = None,
        job_search_status: Optional[str] = None,
        desired_positions: Optional[str] = None,
        employment_type_preference: Optional[str] = None,
        preferred_region: Optional[str] = None,
        availability_date: Optional[str] = None,
        salary_expectation: Optional[str] = None,
        job_search_notes: Optional[str] = None,
        resume_url: Optional[str] = None,
        document_urls: Optional[List[str]] = None,
    ) -> models.Researcher:
        with session_factory() as session:
            researcher = session.scalars(
                select(models.Researcher).where(models.Researcher.user_id == user_id)
            ).first()
            if not researcher:
                researcher = models.Researcher(
                    user_id=user_id,
                    full_name=full_name or "Исследователь",
                    position=position,
                    academic_degree=academic_degree,
                    research_interests=research_interests or [],
                    education=education or [],
                    publications=publications or [],
                    hindex_wos=hindex_wos,
                    hindex_scopus=hindex_scopus,
                    hindex_rsci=hindex_rsci,
                    hindex_openalex=hindex_openalex,
                    job_search_status=job_search_status,
                    desired_positions=desired_positions,
                    employment_type_preference=employment_type_preference,
                    preferred_region=preferred_region,
                    availability_date=availability_date,
                    salary_expectation=salary_expectation,
                    job_search_notes=job_search_notes,
                    resume_url=resume_url,
                    document_urls=document_urls or [],
                )
                session.add(researcher)
                session.flush()
            else:
                if full_name is not None:
                    researcher.full_name = full_name
                if position is not None:
                    researcher.position = position
                if academic_degree is not None:
                    researcher.academic_degree = academic_degree
                if research_interests is not None:
                    researcher.research_interests = research_interests
                if education is not None:
                    researcher.education = education
                if publications is not None:
                    researcher.publications = publications
                if hindex_wos is not None:
                    researcher.hindex_wos = hindex_wos
                if hindex_scopus is not None:
                    researcher.hindex_scopus = hindex_scopus
                if hindex_rsci is not None:
                    researcher.hindex_rsci = hindex_rsci
                if hindex_openalex is not None:
                    researcher.hindex_openalex = hindex_openalex
                if job_search_status is not None:
                    researcher.job_search_status = job_search_status
                if desired_positions is not None:
                    researcher.desired_positions = desired_positions
                if employment_type_preference is not None:
                    researcher.employment_type_preference = employment_type_preference
                if preferred_region is not None:
                    researcher.preferred_region = preferred_region
                if availability_date is not None:
                    researcher.availability_date = availability_date
                if salary_expectation is not None:
                    researcher.salary_expectation = salary_expectation
                if job_search_notes is not None:
                    researcher.job_search_notes = job_search_notes
                if resume_url is not None:
                    researcher.resume_url = resume_url
                if document_urls is not None:
                    researcher.document_urls = document_urls
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            session.refresh(researcher)
            stmt = (
                select(models.Researcher)
                .options(selectinload(models.Researcher.laboratories))
                .where(models.Researcher.id == researcher.id)
            )
            return session.scalars(stmt).first()
