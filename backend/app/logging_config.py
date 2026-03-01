"""
Централизованная конфигурация логирования.
Вызывается при старте приложения.
Логи пишутся в stdout (для docker logs). При LOG_FILE_PATH — также в файл (для монтирования на хост).
"""

import logging
import sys
from logging.handlers import RotatingFileHandler

from app.config import settings


def setup_logging() -> None:
    """Настраивает логирование: уровень, формат, stdout и опционально файл."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    log_format = settings.LOG_FORMAT.lower()

    if log_format == "json":
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    # stdout — для docker logs
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    root.addHandler(stdout_handler)

    # файл — для монтирования на хост (ротация 5 MB × 3 файла)
    if settings.LOG_FILE_PATH:
        try:
            file_handler = RotatingFileHandler(
                settings.LOG_FILE_PATH,
                maxBytes=5 * 1024 * 1024,
                backupCount=3,
                encoding="utf-8",
            )
            file_handler.setFormatter(formatter)
            root.addHandler(file_handler)
        except OSError as e:
            root.warning("Cannot open log file %s: %s", settings.LOG_FILE_PATH, e)
