"""
SQLAlchemy ORM-модели для роли исследователя.
"""

from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text, JSON, Index, func
from sqlalchemy.orm import relationship

from app.database import BaseModel


class Researcher(BaseModel):
    """
    Профиль исследователя — дублирует поля Employee для будущей привязки к лаборатории/организации.
    Создаётся без организации и лаборатории.
    """
    __tablename__ = "researchers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(255), nullable=False)
    position = Column(String(500), nullable=True)
    academic_degree = Column(String(255), nullable=True)
    research_interests = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    publications = Column(JSON, nullable=True)
    hindex_wos = Column(Integer, nullable=True)
    hindex_scopus = Column(Integer, nullable=True)
    hindex_rsci = Column(Integer, nullable=True)
    hindex_openalex = Column(Integer, nullable=True)
    job_search_status = Column(String(50), nullable=True)
    desired_positions = Column(String(500), nullable=True)
    employment_type_preference = Column(String(500), nullable=True)
    preferred_region = Column(String(255), nullable=True)
    availability_date = Column(String(100), nullable=True)
    salary_expectation = Column(String(100), nullable=True)
    job_search_notes = Column(Text, nullable=True)
    resume_url = Column(String(500), nullable=True)
    document_urls = Column(JSON, nullable=True)
    is_published = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="researcher_profile")
    organization = relationship("Organization")
    laboratories = relationship(
        "OrganizationLaboratory",
        secondary="researcher_laboratories",
        back_populates="researchers",
    )
    lab_join_requests = relationship(
        "LabJoinRequest",
        back_populates="researcher",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_researcher_user", "user_id"),
        Index("idx_researcher_organization", "organization_id"),
        Index("idx_researcher_job_search", "job_search_status"),
    )
