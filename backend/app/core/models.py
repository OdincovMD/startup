"""
SQLAlchemy ORM-модели для ядра: User, Role, Notification.
Общие для всех ролей.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Index,
    func,
)
from sqlalchemy.orm import relationship

from app.database import BaseModel


# =========================
#          ROLES
# =========================

class Role(BaseModel):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


# =========================
#           USERS
# =========================

class User(BaseModel):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    mail = Column("email", String(255), unique=True, nullable=False, index=True)
    hash_parameter = Column("hashed_password", String(255), nullable=True)
    orcid = Column(String(19), unique=True, nullable=True, index=True)
    openalex_id = Column(String(20), unique=True, nullable=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(255), nullable=True)
    contacts = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def email_verified(self) -> bool:
        """Заглушка под будущее подтверждение email."""
        return False

    @property
    def has_password(self) -> bool:
        """Есть ли у пользователя пароль (зарегистрирован через email или только через ORCID)."""
        return bool(self.hash_parameter)

    role = relationship("Role")
    organization = relationship(
        "Organization",
        foreign_keys=[organization_id],
    )
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    employee_profile = relationship(
        "Employee",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="Employee.user_id",
    )
    researcher_profile = relationship(
        "Researcher",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_users_mail", "email"),
        Index("idx_users_role_id", "role_id"),
    )


# =========================
#        NOTIFICATIONS
# =========================

class Notification(BaseModel):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(100), nullable=False)
    data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("idx_notification_user", "user_id"),
        Index("idx_notification_type", "type"),
    )
