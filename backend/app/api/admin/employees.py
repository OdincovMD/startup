"""Admin API: employees CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.api.admin.deps import require_admin
from app.queries.orm import Orm
from app.services.elasticsearch import reindex_laboratories_by_ids, reindex_organizations_by_ids
from app.roles.representative.schemas import EmployeeUpdate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-employees"])


def _employee_to_read(emp, for_list=False):
    """Serialize employee for admin response."""
    org = getattr(emp, "organization", None)
    labs = getattr(emp, "laboratories", None) or []
    pos = getattr(emp, "position", None)
    if isinstance(pos, list):
        positions = pos
    elif pos:
        positions = [pos]
    else:
        positions = []
    out = {
        "id": emp.id,
        "full_name": emp.full_name or "",
        "positions": positions,
        "academic_degree": getattr(emp, "academic_degree", None),
        "photo_url": getattr(emp, "photo_url", None),
        "research_interests": getattr(emp, "research_interests", None) or [],
        "education": getattr(emp, "education", None) or [],
        "publications": getattr(emp, "publications", None) or [],
        "hindex_wos": getattr(emp, "hindex_wos", None),
        "hindex_scopus": getattr(emp, "hindex_scopus", None),
        "hindex_rsci": getattr(emp, "hindex_rsci", None),
        "hindex_openalex": getattr(emp, "hindex_openalex", None),
        "contacts": getattr(emp, "contacts", None) or {},
        "organization_id": getattr(emp, "organization_id", None),
        "creator_user_id": getattr(emp, "creator_user_id", None),
        "organization_name": org.name if org else None,
        "laboratory_ids": [lab.id for lab in labs],
    }
    if not for_list:
        out["laboratories"] = [{"id": lab.id, "name": lab.name, "public_id": lab.public_id} for lab in labs]
    return out


@router.get("/employees")
async def list_employees_admin(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """List all employees (admin only)."""
    require_admin(current_user)
    items, total = await Orm.list_employees_admin(page=page, size=size)
    return {
        "items": [_employee_to_read(e, for_list=True) for e in items],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/employees/{employee_id}")
async def get_employee_admin(
    employee_id: int,
    current_user=Depends(get_current_user),
):
    """Get employee by id (admin only)."""
    require_admin(current_user)
    emp = await Orm.admin_get_employee(employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _employee_to_read(emp)


@router.put("/employees/{employee_id}")
async def update_employee_admin(
    employee_id: int,
    payload: EmployeeUpdate,
    current_user=Depends(get_current_user),
):
    """Update employee (admin only)."""
    require_admin(current_user)
    emp = await Orm.admin_get_employee(employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    patch = payload.model_dump(exclude_unset=True)
    positions = patch.get("positions")
    if positions is not None:
        patch["positions"] = positions
    emp = await Orm.admin_update_employee(employee_id, **patch)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    lab_ids = [l.id for l in (emp.laboratories or [])]
    if lab_ids:
        try:
            await reindex_laboratories_by_ids(lab_ids)
            if emp.organization_id:
                await reindex_organizations_by_ids([emp.organization_id])
        except Exception as e:
            logger.warning("ES sync failed after employee update: %s", e)
    return _employee_to_read(emp)


@router.delete("/employees/{employee_id}")
async def delete_employee_admin(
    employee_id: int,
    current_user=Depends(get_current_user),
):
    """Delete employee (admin only)."""
    require_admin(current_user)
    emp = await Orm.admin_get_employee(employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    ok, _, _ = await Orm.admin_delete_employee(employee_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return {"ok": True}
