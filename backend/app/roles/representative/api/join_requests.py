"""
API для заявок на присоединение: Исследователь→Лаборатория, Лаборатория→Организация.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.services.elasticsearch import reindex_laboratories_by_ids

logger = logging.getLogger(__name__)
from app.queries.async_orm import AsyncOrm
from app.roles.representative.api._helpers import is_lab_representative

router = APIRouter(prefix="/join-requests", tags=["profile-join-requests"])


async def _notify_lab_join_created(lab, researcher_full_name: str, request_id: int):
    """Уведомить модераторов лаборатории о новой заявке."""
    if lab.organization_id:
        user_ids = await AsyncOrm.get_lab_admin_user_ids_for_organization(lab.organization_id)
    else:
        user_ids = [lab.creator_user_id] if lab.creator_user_id else []
    data = {"request_id": request_id, "researcher_full_name": researcher_full_name, "lab_name": lab.name}
    for uid in user_ids:
        await AsyncOrm.create_notification(uid, "lab_join_request_created", data)


async def _notify_org_join_created(org_id: int, lab_name: str, request_id: int):
    """Уведомить lab_admin организации о новой заявке лаборатории."""
    user_ids = await AsyncOrm.get_lab_admin_user_ids_for_organization(org_id)
    data = {"request_id": request_id, "lab_name": lab_name}
    for uid in user_ids:
        await AsyncOrm.create_notification(uid, "org_join_request_created", data)


def _is_researcher(user) -> bool:
    return user.role is not None and user.role.name == "researcher"


def _is_lab_admin(user) -> bool:
    return user.role is not None and user.role.name == "lab_admin"


# =========================
#   LAB JOIN (Researcher)
# =========================


class LabJoinBody(BaseModel):
    lab_public_id: str


@router.post("/lab")
async def create_lab_join_request(
    body: LabJoinBody,
    current_user=Depends(get_current_user),
):
    """Исследователь создаёт заявку на присоединение к лаборатории."""
    if not _is_researcher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для исследователя")
    researcher = await AsyncOrm.get_researcher_by_user(current_user.id)
    if not researcher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Профиль исследователя не найден")
    lab = await AsyncOrm.get_laboratory_by_public_id(body.lab_public_id.strip())
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лаборатория не найдена")
    if not getattr(lab, "is_published", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Лаборатория не опубликована")
    try:
        req = await AsyncOrm.create_lab_join_request(researcher.id, lab.id)
        await _notify_lab_join_created(lab, researcher.full_name or "", req.id)
        logger.info("Lab join request created: request_id=%s researcher_id=%s lab_id=%s", req.id, researcher.id, lab.id)
        return {"id": req.id, "status": req.status, "laboratory_id": lab.id}
    except ValueError as e:
        logger.warning("Lab join request failed: researcher_id=%s lab_id=%s: %s", researcher.id, lab.id, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/lab/{laboratory_id:int}")
async def leave_laboratory(
    laboratory_id: int,
    current_user=Depends(get_current_user),
):
    """Исследователь покидает лабораторию."""
    if not _is_researcher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для исследователя")
    researcher = await AsyncOrm.get_researcher_by_user(current_user.id)
    if not researcher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Профиль исследователя не найден")
    ok = await AsyncOrm.leave_laboratory(researcher.id, laboratory_id)
    if not ok:
        logger.warning("Leave laboratory failed: researcher_id=%s lab_id=%s not member", researcher.id, laboratory_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Вы не состоите в этой лаборатории")
    try:
        await reindex_laboratories_by_ids([laboratory_id])
    except Exception as e:
        logger.warning("Laboratory reindex failed after leave: lab_id=%s %s", laboratory_id, e)
    logger.info("Researcher left laboratory: researcher_id=%s lab_id=%s", researcher.id, laboratory_id)
    return {"ok": True}


# =========================
#   ORG JOIN (Lab Rep)
# =========================


class OrgJoinBody(BaseModel):
    org_public_id: str
    lab_public_id: str


@router.post("/org")
async def create_org_join_request(
    body: OrgJoinBody,
    current_user=Depends(get_current_user),
):
    """Представитель лаборатории создаёт заявку на присоединение к организации."""
    if not is_lab_representative(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя лаборатории")
    org = await AsyncOrm.get_organization_by_public_id(body.org_public_id.strip())
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Организация не найдена")
    if not getattr(org, "is_published", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Организация не опубликована")
    lab = await AsyncOrm.get_laboratory_by_public_id(body.lab_public_id.strip())
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лаборатория не найдена")
    if lab.creator_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Это не ваша лаборатория")
    if lab.organization_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Лаборатория уже привязана к организации")
    try:
        req = await AsyncOrm.create_org_join_request(lab.id, org.id)
        await _notify_org_join_created(org.id, lab.name or "", req.id)
        logger.info("Org join request created: request_id=%s lab_id=%s org_id=%s", req.id, lab.id, org.id)
        return {"id": req.id, "status": req.status, "laboratory_id": lab.id, "organization_id": org.id}
    except ValueError as e:
        logger.warning("Org join request failed: lab_id=%s org_id=%s: %s", lab.id, org.id, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# =========================
#   MY REQUESTS (Researcher / Lab Rep)
# =========================


@router.get("")
async def get_my_join_requests(current_user=Depends(get_current_user)):
    """Мои заявки: lab (для researcher) и org (для lab_rep)."""
    lab_requests = []
    org_requests = []
    if _is_researcher(current_user):
        researcher = await AsyncOrm.get_researcher_by_user(current_user.id)
        if researcher:
            lab_requests = await AsyncOrm.get_lab_join_requests_for_researcher(researcher.id)
    if is_lab_representative(current_user):
        org_requests = await AsyncOrm.get_org_join_requests_for_researcher_or_lab_rep(current_user.id)
    return {
        "lab": [
            {
                "id": r.id,
                "status": r.status,
                "laboratory": {"id": r.laboratory.id, "name": r.laboratory.name, "public_id": r.laboratory.public_id}
                if r.laboratory else None,
            }
            for r in lab_requests
        ],
        "org": [
            {
                "id": r.id,
                "status": r.status,
                "laboratory": {"id": r.laboratory.id, "name": r.laboratory.name}
                if r.laboratory else None,
                "organization": {"id": r.organization.id, "name": r.organization.name, "public_id": r.organization.public_id}
                if r.organization else None,
            }
            for r in org_requests
        ],
    }


# =========================
#   INCOMING LAB REQUESTS (Lab Admin / Lab Rep)
# =========================


@router.get("/organization/lab")
async def get_org_incoming_lab_requests(current_user=Depends(get_current_user)):
    """Входящие заявки исследователей для лабораторий организации (lab_admin)."""
    if not _is_lab_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя организации")
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if not org:
        return []
    requests = await AsyncOrm.get_lab_join_requests_for_org(org.id)
    return [
        {
            "id": r.id,
            "researcher": {"id": r.researcher.id, "full_name": r.researcher.full_name}
            if r.researcher else None,
            "laboratory": {"id": r.laboratory.id, "name": r.laboratory.name, "public_id": r.laboratory.public_id}
            if r.laboratory else None,
        }
        for r in requests
    ]


@router.get("/laboratories/lab")
async def get_creator_incoming_lab_requests(current_user=Depends(get_current_user)):
    """Входящие заявки исследователей для своих лабораторий (lab_representative)."""
    if not is_lab_representative(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя лаборатории")
    requests = await AsyncOrm.get_lab_join_requests_for_creator(current_user.id)
    return [
        {
            "id": r.id,
            "researcher": {"id": r.researcher.id, "full_name": r.researcher.full_name}
            if r.researcher else None,
            "laboratory": {"id": r.laboratory.id, "name": r.laboratory.name, "public_id": r.laboratory.public_id}
            if r.laboratory else None,
        }
        for r in requests
    ]


@router.post("/lab/{request_id:int}/approve")
async def approve_lab_join_request(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Принять заявку исследователя (lab_admin или lab_rep)."""
    req = await AsyncOrm.get_lab_join_request_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    lab = req.laboratory
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лаборатория не найдена")
    can_approve = False
    if _is_lab_admin(current_user):
        org = await AsyncOrm.get_organization_for_user(current_user.id)
        if org and lab.organization_id == org.id:
            can_approve = True
    if is_lab_representative(current_user) and lab.creator_user_id == current_user.id:
        can_approve = True
    if not can_approve:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на обработку этой заявки")
    updated = await AsyncOrm.approve_lab_join_request(request_id)
    if not updated:
        logger.warning("Approve lab join failed: request_id=%s already processed", request_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заявка уже обработана")
    try:
        await reindex_laboratories_by_ids([lab.id])
    except Exception as e:
        logger.warning("Laboratory reindex failed after approve lab join: lab_id=%s %s", lab.id, e)
    researcher_user_id = req.researcher.user_id if req.researcher else None
    if researcher_user_id:
        await AsyncOrm.create_notification(
            researcher_user_id,
            "lab_join_approved",
            {"lab_name": lab.name, "lab_public_id": getattr(lab, "public_id", None)},
        )
    logger.info("Lab join request approved: request_id=%s lab_id=%s", request_id, lab.id)
    return {"ok": True, "status": "approved"}


@router.post("/lab/{request_id:int}/reject")
async def reject_lab_join_request(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Отклонить заявку исследователя."""
    req = await AsyncOrm.get_lab_join_request_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    lab = req.laboratory
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Лаборатория не найдена")
    can_reject = False
    if _is_lab_admin(current_user):
        org = await AsyncOrm.get_organization_for_user(current_user.id)
        if org and lab.organization_id == org.id:
            can_reject = True
    if is_lab_representative(current_user) and lab.creator_user_id == current_user.id:
        can_reject = True
    if not can_reject:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на обработку этой заявки")
    updated = await AsyncOrm.reject_lab_join_request(request_id)
    if not updated:
        logger.warning("Reject lab join failed: request_id=%s already processed", request_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заявка уже обработана")
    researcher_user_id = req.researcher.user_id if req.researcher else None
    if researcher_user_id:
        await AsyncOrm.create_notification(
            researcher_user_id,
            "lab_join_rejected",
            {"lab_name": lab.name, "lab_public_id": getattr(lab, "public_id", None)},
        )
    logger.info("Lab join request rejected: request_id=%s lab_id=%s", request_id, lab.id)
    return {"ok": True, "status": "rejected"}


# =========================
#   INCOMING ORG REQUESTS (Lab Admin)
# =========================


@router.get("/organization/org")
async def get_org_incoming_org_requests(current_user=Depends(get_current_user)):
    """Входящие заявки лабораторий на присоединение (lab_admin)."""
    if not _is_lab_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя организации")
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if not org:
        return []
    requests = await AsyncOrm.get_org_join_requests_for_org(org.id)
    return [
        {
            "id": r.id,
            "laboratory": {"id": r.laboratory.id, "name": r.laboratory.name, "public_id": r.laboratory.public_id}
            if r.laboratory else None,
            "organization": {"id": r.organization.id, "name": r.organization.name}
            if r.organization else None,
        }
        for r in requests
    ]


@router.post("/org/{request_id:int}/approve")
async def approve_org_join_request(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Принять заявку лаборатории (lab_admin)."""
    if not _is_lab_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя организации")
    req = await AsyncOrm.get_org_join_request_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if not org or req.organization_id != org.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на обработку этой заявки")
    updated = await AsyncOrm.approve_org_join_request(request_id)
    if not updated:
        logger.warning("Approve org join failed: request_id=%s already processed", request_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заявка уже обработана")
    lab = req.laboratory
    if lab:
        try:
            await reindex_laboratories_by_ids([lab.id])
        except Exception as e:
            logger.warning("Laboratory reindex failed after approve org join: lab_id=%s %s", lab.id, e)
    if lab and lab.creator_user_id:
        await AsyncOrm.create_notification(
            lab.creator_user_id,
            "org_join_approved",
            {"org_name": org.name, "org_public_id": getattr(org, "public_id", None)},
        )
    logger.info("Org join request approved: request_id=%s org_id=%s lab_id=%s", request_id, org.id, lab.id if lab else None)
    return {"ok": True, "status": "approved"}


@router.post("/org/{request_id:int}/reject")
async def reject_org_join_request(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Отклонить заявку лаборатории."""
    if not _is_lab_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя организации")
    req = await AsyncOrm.get_org_join_request_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    org = await AsyncOrm.get_organization_for_user(current_user.id)
    if not org or req.organization_id != org.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на обработку этой заявки")
    updated = await AsyncOrm.reject_org_join_request(request_id)
    if not updated:
        logger.warning("Reject org join failed: request_id=%s already processed", request_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Заявка уже обработана")
    lab = req.laboratory
    if lab and lab.creator_user_id:
        await AsyncOrm.create_notification(
            lab.creator_user_id,
            "org_join_rejected",
            {"org_name": org.name, "org_public_id": getattr(org, "public_id", None)},
        )
    logger.info("Org join request rejected: request_id=%s org_id=%s", request_id, org.id)
    return {"ok": True, "status": "rejected"}


@router.delete("/org/{request_id:int}")
async def leave_organization(
    request_id: int,
    current_user=Depends(get_current_user),
):
    """Представитель лаборатории покидает организацию."""
    if not is_lab_representative(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступно только для представителя лаборатории")
    result = await AsyncOrm.leave_organization(request_id, current_user.id)
    if not result:
        logger.warning("Leave organization failed: request_id=%s user_id=%s not found", request_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена или уже обработана")
    if result.get("lab_id"):
        try:
            await reindex_laboratories_by_ids([result["lab_id"]])
        except Exception as e:
            logger.warning("Laboratory reindex failed after leave org: lab_id=%s %s", result["lab_id"], e)
    user_ids = await AsyncOrm.get_lab_admin_user_ids_for_organization(result["org_id"])
    for uid in user_ids:
        await AsyncOrm.create_notification(
            uid,
            "org_join_left",
            {"lab_name": result["lab_name"], "org_name": result["org_name"]},
        )
    logger.info("Lab left organization: request_id=%s org_id=%s lab_id=%s", request_id, result["org_id"], result.get("lab_id"))
    return {"ok": True}
