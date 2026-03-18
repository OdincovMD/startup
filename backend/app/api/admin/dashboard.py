"""Admin API: dashboard stats."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm

router = APIRouter(tags=["admin-dashboard"])


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user=Depends(get_current_user),
):
    """Get admin dashboard statistics (admin only)."""
    require_admin(current_user)
    return await Orm.get_admin_dashboard_stats()
