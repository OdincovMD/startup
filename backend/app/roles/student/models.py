"""
SQLAlchemy ORM-модели для роли студента.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Index, func
from sqlalchemy.orm import relationship

from app.database import BaseModel


class Student(BaseModel):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    status = Column(String(100), nullable=True)
    skills = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    resume_url = Column(String(500), nullable=True)
    document_urls = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    research_interests = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="student_profile")

    __table_args__ = (
        Index("idx_student_user", "user_id"),
    )
