"""
Direct upload endpoints for S3-compatible storage.
"""

import asyncio
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.schemas import StorageUploadResponse
from app.storage.s3 import upload_bytes

router = APIRouter(prefix="/storage", tags=["storage"])

ALLOWED_CATEGORIES = {"equipment", "laboratory", "employee", "organization", "researcher", "student", "user"}
ALLOWED_MIME_PREFIXES = ("image/",)
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}
ALLOWED_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"}


def _is_allowed_upload(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    if any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        return True
    if content_type in ALLOWED_MIME_TYPES:
        return True
    ext = os.path.splitext(file.filename or "")[1].lower()
    return ext in ALLOWED_EXTS


@router.post("/upload", response_model=StorageUploadResponse)
async def upload_image(
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported category")
    if not _is_allowed_upload(file):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    data = await file.read()
    public_url, key = await asyncio.to_thread(
        upload_bytes,
        category,
        current_user.id,
        file.filename or "image",
        file.content_type or "application/octet-stream",
        data,
    )
    return StorageUploadResponse(public_url=public_url, key=key)
