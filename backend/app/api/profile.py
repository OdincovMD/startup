"""
Совместимый профильный роутер, объединяющий домены.
"""

from fastapi import APIRouter

from app.api.openalex import router as openalex_router
from app.api.notifications import router as notifications_router
from app.roles.representative.api.profile import router as organization_router
from app.roles.representative.api.openalex import router as org_openalex_router
from app.roles.representative.api.join_requests import router as join_requests_router
from app.roles.student.api.profile import router as student_router
from app.roles.researcher.api.profile import router as researcher_router

router = APIRouter(prefix="/profile", tags=["profile"])
router.include_router(openalex_router)
router.include_router(notifications_router)
router.include_router(join_requests_router)
router.include_router(organization_router)
router.include_router(org_openalex_router)
router.include_router(student_router)
router.include_router(researcher_router)
