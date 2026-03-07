"""Подменяет localhost-URL хранилища на публичный для доступа через туннель."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings
from app.storage.s3 import _public_base_url


class StorageUrlRewriteMiddleware(BaseHTTPMiddleware):
    """Подменяет localhost-URL хранилища на публичный для доступа через туннель."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        ct = response.headers.get("content-type", "")
        if response.status_code != 200 or "application/json" not in ct:
            return response
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        text = body.decode("utf-8", errors="replace")
        prefix = settings.S3_LOCALHOST_STORAGE_PREFIX
        if prefix in text:
            public = _public_base_url()
            text = text.replace(prefix, public)
        new_body = text.encode("utf-8")
        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        return Response(
            content=new_body,
            status_code=response.status_code,
            headers=headers,
            media_type=ct,
        )
