"""
Синхронный слой работы с БД для роли студента.
"""

from typing import Optional, List, Dict, Any

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database import session_factory
from app import models


class SyncOrm:
    @staticmethod
    def get_student_by_user(user_id: int) -> Optional[models.Student]:
        with session_factory() as session:
            stmt = select(models.Student).where(models.Student.user_id == user_id)
            return session.scalars(stmt).first()

    @staticmethod
    def upsert_student_profile(
        user_id: int,
        full_name: Optional[str] = None,
        university: Optional[str] = None,
        level: Optional[str] = None,
        direction: Optional[str] = None,
        status: Optional[str] = None,
        skills: Optional[List[str]] = None,
        summary: Optional[str] = None,
        photo_url: Optional[str] = None,
        resume_url: Optional[str] = None,
        document_urls: Optional[List[str]] = None,
        education: Optional[List[str]] = None,
        research_interests: Optional[List[str]] = None,
        contacts: Optional[dict] = None,
    ) -> models.Student:
        with session_factory() as session:
            student = session.scalars(
                select(models.Student).where(models.Student.user_id == user_id)
            ).first()
            if not student:
                student = models.Student(
                    user_id=user_id,
                    full_name=full_name or "Студент",
                    university=university,
                    level=level,
                    direction=direction,
                    status=status,
                    skills=skills or [],
                    summary=summary,
                    photo_url=photo_url,
                    resume_url=resume_url,
                    document_urls=document_urls or [],
                    education=education or [],
                    research_interests=research_interests or [],
                    contacts=contacts or {},
                )
                session.add(student)
            else:
                if full_name is not None:
                    student.full_name = full_name
                if university is not None:
                    student.university = university
                if level is not None:
                    student.level = level
                if direction is not None:
                    student.direction = direction
                if status is not None:
                    student.status = status
                if skills is not None:
                    student.skills = skills
                if summary is not None:
                    student.summary = summary
                if photo_url is not None:
                    student.photo_url = photo_url
                if resume_url is not None:
                    student.resume_url = resume_url
                if document_urls is not None:
                    student.document_urls = document_urls
                if education is not None:
                    student.education = education
                if research_interests is not None:
                    student.research_interests = research_interests
                if contacts is not None:
                    student.contacts = contacts
            try:
                session.commit()
            except SQLAlchemyError:
                session.rollback()
                raise
            session.refresh(student)
            return student
