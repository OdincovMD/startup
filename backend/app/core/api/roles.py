"""
Роуты FastAPI для ролей.
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.schemas import RoleRead
from app.queries.orm import Orm

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/", response_model=list[RoleRead])
async def list_roles(_user=Depends(get_current_user)):
    return await Orm.list_roles()
