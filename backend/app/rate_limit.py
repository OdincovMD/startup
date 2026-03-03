"""
Rate limiting for auth and sensitive endpoints.
Uses slowapi with in-memory storage (per process).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
