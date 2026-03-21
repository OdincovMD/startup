"""Admin API: equipment CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import reindex_laboratories_by_ids, reindex_organizations_by_ids
from app.roles.representative.schemas import OrganizationEquipmentUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-equipment"])


def _equipment_to_read(eq, for_list=False):
    """Serialize equipment for admin response."""
    org = getattr(eq, "organization", None)
    labs = getattr(eq, "laboratories", None) or []
    out = {
        "id": eq.id,
        "name": eq.name or "",
        "description": getattr(eq, "description", None),
        "characteristics": getattr(eq, "characteristics", None),
        "image_urls": getattr(eq, "image_urls", None) or [],
        "organization_id": getattr(eq, "organization_id", None),
        "creator_user_id": getattr(eq, "creator_user_id", None),
        "organization_name": org.name if org else None,
        "laboratory_ids": [lab.id for lab in labs],
    }
    if not for_list:
        out["laboratories"] = [{"id": lab.id, "name": lab.name, "public_id": lab.public_id} for lab in labs]
    return out


@router.get("/equipment")
async def list_equipment_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all equipment (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_equipment_admin(page=page, size=size)
    return {
        "items": [_equipment_to_read(e, for_list=True) for e in items],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/equipment/{equipment_id}")
async def get_equipment_admin(
    equipment_id: int,
    current_user=Depends(get_current_user),
):
    """Get equipment by id (admin only)."""
    require_admin(current_user)
    eq = await Orm.admin_get_equipment(equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return _equipment_to_read(eq)


@router.put("/equipment/{equipment_id}")
async def update_equipment_admin(
    equipment_id: int,
    payload: OrganizationEquipmentUpdate,
    current_user=Depends(get_current_user),
):
    """Update equipment (admin only)."""
    require_admin(current_user)
    eq = await Orm.admin_get_equipment(equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    patch = payload.model_dump(exclude_unset=True)
    eq = await Orm.admin_update_equipment(equipment_id, **patch)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    lab_ids = [l.id for l in (eq.laboratories or [])]
    if lab_ids:
        try:
            await reindex_laboratories_by_ids(lab_ids)
            if eq.organization_id:
                await reindex_organizations_by_ids([eq.organization_id])
        except Exception as e:
            logger.warning("ES sync failed after equipment update: %s", e)
    return _equipment_to_read(eq)


@router.delete("/equipment/{equipment_id}")
async def delete_equipment_admin(
    equipment_id: int,
    current_user=Depends(get_current_user),
):
    """Delete equipment (admin only)."""
    require_admin(current_user)
    eq = await Orm.admin_get_equipment(equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    lab_ids = [lab.id for lab in (eq.laboratories or [])]
    org_id = getattr(eq, "organization_id", None)
    ok = await Orm.admin_delete_equipment(equipment_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    if lab_ids:
        try:
            await reindex_laboratories_by_ids(lab_ids)
            if org_id:
                await reindex_organizations_by_ids([org_id])
        except Exception as e:
            logger.warning("ES sync failed after equipment delete: %s", e)
    return {"ok": True}
