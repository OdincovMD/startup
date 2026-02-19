"""
Pydantic-схемы для валидации входных данных и формирования ответов API.
Сохранён совместимый импорт через re-export.
"""

from app.common import ORMModel  # noqa: F401
from app.core.schemas import *  # noqa: F403
from app.roles.student.schemas import *  # noqa: F403
from app.roles.researcher.schemas import *  # noqa: F403
from app.roles.representative.schemas import *  # noqa: F403
