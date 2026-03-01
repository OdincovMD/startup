"""Middleware для FastAPI."""

from app.middleware.storage_url_rewrite import StorageUrlRewriteMiddleware

__all__ = ["StorageUrlRewriteMiddleware"]
