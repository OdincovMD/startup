"""
Public API for collecting user feedback with optional screenshots.
"""

import asyncio
import logging
from typing import Sequence

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_optional
from app.api.storage import MAX_UPLOAD_SIZE_BYTES, _is_allowed_upload, _validate_file_content
from app.core.models import FeedbackAttachment, FeedbackReport, User
from app.core.schemas import (
    FeedbackAttachmentRead,
    FeedbackCreateResponse,
    FeedbackRead,
    FeedbackUserSummary,
)
from app.database import async_session_factory
from app.storage.s3 import upload_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])

MAX_SCREENSHOTS = 5


def _coerce_optional_text(value: str | None) -> str | None:
    text = (value or "").strip()
    return text or None


def _coerce_optional_int(value: str | None) -> int | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        parsed = int(text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Viewport must be an integer") from exc
    return parsed if parsed > 0 else None


async def _validate_screenshots(files: Sequence[UploadFile]) -> list[tuple[UploadFile, bytes]]:
    if len(files) > MAX_SCREENSHOTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Можно прикрепить не более {MAX_SCREENSHOTS} скриншотов",
        )

    prepared: list[tuple[UploadFile, bytes]] = []
    for file in files:
        if not _is_allowed_upload(file) or not (file.content_type or "").lower().startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Допустимы только изображения")
        data = await file.read()
        if len(data) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Файл превышает лимит {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} МБ",
            )
        try:
            _validate_file_content(data, file.content_type or "", file.filename or "")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        prepared.append((file, data))
    return prepared


def _serialize_feedback(report: FeedbackReport) -> FeedbackRead:
    user = None
    if report.user:
        user = FeedbackUserSummary(
            id=report.user.id,
            full_name=report.user.full_name,
            mail=report.user.mail,
            role_name=report.user.role.name if report.user.role else None,
        )

    attachments = [
        FeedbackAttachmentRead.model_validate(attachment)
        for attachment in (report.attachments or [])
    ]

    return FeedbackRead(
        id=report.id,
        subject=report.subject,
        description=report.description,
        steps_to_reproduce=report.steps_to_reproduce,
        current_url=report.current_url,
        user_agent=report.user_agent,
        viewport_width=report.viewport_width,
        viewport_height=report.viewport_height,
        status=report.status,
        created_at=report.created_at,
        updated_at=report.updated_at,
        attachments=attachments,
        user=user,
    )


@router.post("", response_model=FeedbackCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    subject: str = Form(...),
    description: str = Form(...),
    steps_to_reproduce: str | None = Form(None),
    current_url: str = Form(...),
    user_agent: str | None = Form(None),
    viewport_width: str | None = Form(None),
    viewport_height: str | None = Form(None),
    screenshots: list[UploadFile] | None = File(None),
    current_user=Depends(get_current_user_optional),
):
    subject = (subject or "").strip()
    description = (description or "").strip()
    current_url = (current_url or "").strip()

    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Тема обязательна")
    if not description:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Описание обязательно")
    if not current_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий URL обязателен")

    prepared_files = await _validate_screenshots(screenshots or [])

    async with async_session_factory() as session:
        report = FeedbackReport(
            user_id=getattr(current_user, "id", None),
            subject=subject,
            description=description,
            steps_to_reproduce=_coerce_optional_text(steps_to_reproduce),
            current_url=current_url,
            user_agent=_coerce_optional_text(user_agent),
            viewport_width=_coerce_optional_int(viewport_width),
            viewport_height=_coerce_optional_int(viewport_height),
            status="new",
        )
        session.add(report)
        await session.flush()

        uploader_id = getattr(current_user, "id", None) or report.id
        for file, data in prepared_files:
            public_url, key = await asyncio.to_thread(
                upload_bytes,
                "feedback",
                uploader_id,
                file.filename or "screenshot",
                file.content_type or "application/octet-stream",
                data,
            )
            session.add(
                FeedbackAttachment(
                    feedback_report_id=report.id,
                    file_url=public_url,
                    file_key=key,
                    original_name=file.filename or "screenshot",
                    content_type=file.content_type or "application/octet-stream",
                )
            )

        await session.commit()
        await session.refresh(report)

    logger.info(
        "Feedback created: id=%s user_id=%s screenshots=%s",
        report.id,
        getattr(current_user, "id", None),
        len(prepared_files),
    )
    return FeedbackCreateResponse(id=report.id, status=report.status, created_at=report.created_at)


async def list_feedback_paginated(page: int, size: int, feedback_status: str | None = None) -> tuple[list[FeedbackRead], int]:
    async with async_session_factory() as session:
        filters = []
        if feedback_status:
            filters.append(FeedbackReport.status == feedback_status)

        total_stmt = select(func.count(FeedbackReport.id))
        if filters:
            total_stmt = total_stmt.where(*filters)
        total = int((await session.execute(total_stmt)).scalar() or 0)

        stmt = (
            select(FeedbackReport)
            .options(
                selectinload(FeedbackReport.attachments),
                selectinload(FeedbackReport.user).selectinload(User.role),
            )
            .order_by(FeedbackReport.created_at.desc(), FeedbackReport.id.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        if filters:
            stmt = stmt.where(*filters)
        items = (await session.execute(stmt)).scalars().unique().all()
        return [_serialize_feedback(item) for item in items], total


async def get_feedback_or_404(feedback_id: int) -> FeedbackRead:
    async with async_session_factory() as session:
        stmt = (
            select(FeedbackReport)
            .options(
                selectinload(FeedbackReport.attachments),
                selectinload(FeedbackReport.user).selectinload(User.role),
            )
            .where(FeedbackReport.id == feedback_id)
        )
        report = (await session.execute(stmt)).scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
        return _serialize_feedback(report)


async def update_feedback_status(feedback_id: int, next_status: str) -> FeedbackRead:
    async with async_session_factory() as session:
        stmt = (
            select(FeedbackReport)
            .options(
                selectinload(FeedbackReport.attachments),
                selectinload(FeedbackReport.user).selectinload(User.role),
            )
            .where(FeedbackReport.id == feedback_id)
        )
        report = (await session.execute(stmt)).scalar_one_or_none()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
        report.status = next_status
        await session.commit()
        report = (await session.execute(stmt)).scalar_one()
        return _serialize_feedback(report)
