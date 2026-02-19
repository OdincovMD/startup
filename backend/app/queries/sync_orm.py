"""
Синхронный слой работы с БД.
Сохранён совместимый импорт через композицию доменных SyncOrm.
"""

from app.core.queries.sync_orm import SyncOrm as CoreSyncOrm
from app.roles.student.queries.sync_orm import SyncOrm as StudentSyncOrm
from app.roles.researcher.queries.sync_orm import SyncOrm as ResearcherSyncOrm
from app.roles.representative.queries.sync_orm import SyncOrm as RepresentativeSyncOrm


class SyncOrm(CoreSyncOrm, StudentSyncOrm, ResearcherSyncOrm, RepresentativeSyncOrm):
    pass
