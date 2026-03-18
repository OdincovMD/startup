"""Admin API dependencies."""

from fastapi import HTTPException, status


def require_admin(user):
    """Raise 403 if user is not a platform_admin."""
    if not user.role or user.role.name != "platform_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
