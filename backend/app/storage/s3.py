"""
S3-клиент: настройка и утилиты.
"""

import logging
import os
import re
from typing import Tuple

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


def _build_s3_client():
    config = Config(
        s3={"addressing_style": "path" if settings.S3_FORCE_PATH_STYLE else "auto"},
        signature_version="s3v4",
    )
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=config,
    )


def _public_base_url() -> str:
    base = settings.S3_PUBLIC_BASE_URL.rstrip("/")
    return base


def normalize_storage_url(url: str | None) -> str | None:
    """Заменяет localhost-URL хранилища на публичный (для доступа через туннель)."""
    if not url:
        return url
    prefix = settings.S3_LOCALHOST_STORAGE_PREFIX
    if url.startswith(prefix):
        return url.replace(prefix, _public_base_url(), 1)
    return url


def normalize_storage_urls_in_text(text: str | None) -> str | None:
    """Заменяет все localhost-URL хранилища в строке на публичные."""
    if not text:
        return text
    return text.replace(settings.S3_LOCALHOST_STORAGE_PREFIX, _public_base_url())


def _sanitize_filename(filename: str) -> str:
    """Оставляем оригинальное имя файла, убираем опасные символы."""
    name = os.path.basename(filename or "").strip()
    if not name:
        return "file"
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = re.sub(r"_+", "_", name).strip("_.")
    if not name:
        return "file"
    return name[:200]


def _build_key(category: str, user_id: int, filename: str) -> str:
    safe_name = _sanitize_filename(filename)
    safe_category = category.replace("/", "_")
    return f"org/{user_id}/{safe_category}/{safe_name}"


def upload_bytes(
    category: str,
    organization_id: int,
    filename: str,
    content_type: str,
    data: bytes,
) -> Tuple[str, str]:
    key = _build_key(category, organization_id, filename)
    client = _build_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    public_url = f"{_public_base_url()}/{key}"
    return public_url, key


def ensure_bucket_ready() -> None:
    client = _build_s3_client()
    bucket = settings.S3_BUCKET
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        try:
            if settings.S3_REGION and settings.S3_REGION != "us-east-1":
                client.create_bucket(
                    Bucket=bucket,
                    CreateBucketConfiguration={"LocationConstraint": settings.S3_REGION},
                )
            else:
                client.create_bucket(Bucket=bucket)
        except ClientError as exc:
            logger.warning("S3 bucket create failed: %s", exc)
            return

    if settings.S3_APPLY_CORS:
        cors = {
            "CORSRules": [
                {
                    "AllowedOrigins": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedHeaders": ["*"],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        }
        try:
            client.put_bucket_cors(Bucket=bucket, CORSConfiguration=cors)
        except ClientError as exc:
            logger.warning("S3 CORS setup failed: %s", exc)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicRead",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }
        ],
    }
    try:
        client.put_bucket_policy(Bucket=bucket, Policy=str(policy).replace("'", '"'))
    except ClientError as exc:
        logger.warning("S3 public policy setup failed: %s", exc)
