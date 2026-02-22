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
    Boolean,
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
    photo_url = Column(String(500), nullable=True)
    contacts = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    email_verified = Column(Boolean, nullable=False, server_default="false")

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
#   EMAIL VERIFICATION
# =========================

class EmailVerificationToken(BaseModel):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("idx_email_verification_token_user", "user_id"),)


# =========================
#    PASSWORD RESET TOKENS
# =========================

class PasswordResetToken(BaseModel):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("idx_password_reset_token_user", "user_id"),)


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


# =========================
#      ANALYTICS EVENTS
# =========================

class AnalyticsEvent(BaseModel):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_id = Column(String(64), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(32), nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_analytics_events_entity", "entity_type", "entity_id"),
        Index("idx_analytics_events_user_created", "user_id", "created_at"),
        Index("idx_analytics_events_type_created", "event_type", "created_at"),
    )
