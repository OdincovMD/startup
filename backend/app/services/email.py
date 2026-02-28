"""
Отправка транзакционных писем (верификация email, сброс пароля, отклики на вакансии).
Использует SMTP; вызывать через asyncio.to_thread из async-кода при необходимости.
Шаблоны HTML и текста лежат в app/services/email_templates/.
"""

import logging
import smtplib
from pathlib import Path

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)

_TEMPLATES_DIR = Path(__file__).resolve().parent / "email_templates"
_template_cache: dict[str, tuple[str, str | None]] = {}


def _load_template(name: str) -> tuple[str, str | None]:
    """Загрузить HTML и опционально TXT шаблон по имени (без расширения). Кэшируем."""
    if name in _template_cache:
        return _template_cache[name]
    html_path = _TEMPLATES_DIR / f"{name}.html"
    txt_path = _TEMPLATES_DIR / f"{name}.txt"
    html = html_path.read_text(encoding="utf-8")
    txt = txt_path.read_text(encoding="utf-8") if txt_path.exists() else None
    _template_cache[name] = (html, txt)
    return html, txt


def _render(name: str, **kwargs: str) -> tuple[str, str | None]:
    """Отрендерить шаблон name, подставив kwargs в HTML и TXT."""
    html_tpl, txt_tpl = _load_template(name)
    html = html_tpl.format(**kwargs)
    txt = txt_tpl.format(**kwargs) if txt_tpl else None
    return html, txt


def send_verification_email(to: str, verify_url: str) -> None:
    """Письмо с ссылкой для подтверждения email."""
    subject = "Подтверждение email — Синтезум"
    body_html, body_text = _render("verification", verify_url=verify_url)
    send_email(to, subject, body_html, body_text)


def send_password_reset_email(to: str, reset_url: str) -> None:
    """Письмо со ссылкой для сброса пароля."""
    subject = "Сброс пароля — Синтезум"
    body_html, body_text = _render("password_reset", reset_url=reset_url)
    send_email(to, subject, body_html, body_text)


def render_vacancy_response(
    applicant_type: str,
    applicant_name: str,
    applicant_email: str,
    applicant_phone: str,
    applicant_telegram: str,
    vacancy_name: str,
    vacancy_url: str,
    candidate_info: str,
    profile_block: str,
    profile_block_txt: str,
    resume_block: str,
    resume_block_txt: str,
) -> tuple[str, str | None]:
    """Отрендерить шаблон письма об отклике на вакансию."""
    return _render(
        "vacancy_response",
        applicant_type=applicant_type,
        applicant_name=applicant_name,
        applicant_email=applicant_email,
        applicant_phone=applicant_phone,
        applicant_telegram=applicant_telegram,
        vacancy_name=vacancy_name,
        vacancy_url=vacancy_url,
        candidate_info=candidate_info,
        profile_block=profile_block,
        profile_block_txt=profile_block_txt,
        resume_block=resume_block,
        resume_block_txt=resume_block_txt,
    )


def send_vacancy_response_email(
    to: str,
    subject: str,
    body_html: str,
    body_text: str | None = None,
) -> None:
    """
    Отправить письмо об отклике на вакансию.
    Ссылка на резюме указывается в теле письма (без вложения файла).
    """
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured, skipping vacancy response email to %s", to)
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    msg["To"] = to
    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.MAIL_FROM, [to], msg.as_string())
        logger.info("Vacancy response email sent to %s subject=%s", to, subject)
    except Exception as e:
        logger.exception("Failed to send vacancy response email to %s: %s", to, e)
        # Не пробрасываем — in-app уведомление уже создано


def send_email(to: str, subject: str, body_html: str, body_text: str | None = None) -> None:
    """
    Отправить письмо на адрес to.
    body_text — опционально для plain-text альтернативы.
    """
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured, skipping email to %s", to)
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    msg["To"] = to
    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.MAIL_FROM, [to], msg.as_string())
        logger.info("Email sent to %s subject=%s", to, subject)
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to, e)
        raise
