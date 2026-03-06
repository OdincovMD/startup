"""
AsyncOrm — асинхронная обёртка над SyncOrm.
Сохранён совместимый импорт через композицию доменных AsyncOrm.
"""

from app.core.queries.orm import AsyncOrm as CoreAsyncOrm
from app.roles.student.queries.orm import AsyncOrm as StudentAsyncOrm
from app.roles.researcher.queries.orm import AsyncOrm as ResearcherAsyncOrm
from app.roles.representative.queries.orm import AsyncOrm as RepresentativeAsyncOrm


class AsyncOrm(CoreAsyncOrm, StudentAsyncOrm, ResearcherAsyncOrm, RepresentativeAsyncOrm):
    pass
