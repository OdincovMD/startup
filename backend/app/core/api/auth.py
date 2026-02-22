"""
Роуты FastAPI для аутентификации (JWT).
POST /register — регистрация пользователя
POST /login    — получение JWT-токена
GET  /orcid    — редирект на ORCID OAuth
GET  /orcid/callback — callback от ORCID
POST /orcid/complete — дорегистрация после ORCID (email, роль)
"""

import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, quote

import jwt
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, RedirectResponse

from app.config import settings
from app.core.models import User
from app.core.schemas import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserRead,
    user_to_read,
    EmailVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    OrcidCompleteRequest,
    SetPasswordRequest,
)
from app.queries.async_orm import AsyncOrm
from app.api.deps import get_current_user
from app.services.email import send_verification_email, send_password_reset_email


router = APIRouter(prefix="/auth", tags=["auth"])
ORCID_STATE_COOKIE = "orcid_state"
ORCID_LINK_UID_COOKIE = "orcid_link_uid"


def _create_access_token(subject: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MIN)
    payload = {"sub": subject, "exp": expires}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    try:
        user = await AsyncOrm.create_user(
            mail=user_in.mail,
            password=user_in.password,
            role_id=user_in.role_id,
        )
        token = await AsyncOrm.create_verification_token(user.id)
        verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
        await asyncio.to_thread(send_verification_email, user.mail, verify_url)
        return user_to_read(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await AsyncOrm.get_user_by_mail(payload.mail)
    if not user or not user.hash_parameter:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not await AsyncOrm.verify_password(payload.password, user.hash_parameter):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = _create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_read(user))


@router.post("/verify-email", response_model=UserRead)
async def verify_email(payload: EmailVerificationRequest):
    user = await AsyncOrm.verify_email_by_token(payload.token)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    return user_to_read(user)


@router.post("/resend-verification")
async def resend_verification(user: User = Depends(get_current_user)):
    """Повторная отправка письма с ссылкой подтверждения. Только для пользователей с email_verified=false."""
    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
    token = await AsyncOrm.create_verification_token(user.id)
    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    await asyncio.to_thread(send_verification_email, user.mail, verify_url)
    return {"detail": "Verification email sent"}


GENERIC_FORGOT_PASSWORD_RESPONSE = "Если аккаунт с таким email существует и подтверждён, вы получите письмо с инструкциями."


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Запрос сброса пароля. Отправляет письмо только если аккаунт есть и email подтверждён. Всегда возвращает один и тот же текст (защита от перебора email)."""
    user = await AsyncOrm.get_user_by_mail(payload.mail)
    if user and user.email_verified:
        token = await AsyncOrm.create_password_reset_token(user.id)
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        await asyncio.to_thread(send_password_reset_email, user.mail, reset_url)
    return {"detail": GENERIC_FORGOT_PASSWORD_RESPONSE}


@router.post("/reset-password", response_model=UserRead)
async def reset_password(payload: ResetPasswordRequest):
    """Установка нового пароля по токену из письма."""
    try:
        user = await AsyncOrm.consume_password_reset_token(payload.token, payload.password)
    except ValueError as e:
        if "отличаться" in str(e):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        raise
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недействительная или просроченная ссылка")
    return user_to_read(user)


@router.post("/me/set-password")
async def set_password(payload: SetPasswordRequest, user: User = Depends(get_current_user)):
    """Установить пароль для пользователя, зарегистрированного через ORCID (без пароля)."""
    try:
        await AsyncOrm.update_user_password(user.id, payload.password)
        return {"detail": "Пароль установлен"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# =============================
#         ORCID OAuth
# =============================


@router.get("/orcid")
async def orcid_start(request: Request):
    """Редирект на ORCID authorize (вход или регистрация)."""
    if not settings.ORCID_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ORCID not configured")
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.ORCID_CLIENT_ID,
        "response_type": "code",
        "scope": "/authenticate",
        "redirect_uri": settings.ORCID_REDIRECT_URI,
        "state": state,
    }
    url = f"{settings.ORCID_AUTHORIZE_URL}?{urlencode(params)}"
    response = RedirectResponse(url=url, status_code=302)
    response.set_cookie(
        key=ORCID_STATE_COOKIE,
        value=state,
        max_age=600,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return response


@router.post("/orcid/link")
async def orcid_link_start(user=Depends(get_current_user)):
    """Установить cookie для привязки ORCID. Фронтенд редиректит на redirect_url."""
    if not settings.ORCID_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ORCID not configured")
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.ORCID_CLIENT_ID,
        "response_type": "code",
        "scope": "/authenticate",
        "redirect_uri": settings.ORCID_REDIRECT_URI,
        "state": state,
    }
    url = f"{settings.ORCID_AUTHORIZE_URL}?{urlencode(params)}"
    response = JSONResponse(content={"redirect_url": url})
    response.set_cookie(
        ORCID_STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", path="/"
    )
    response.set_cookie(
        ORCID_LINK_UID_COOKIE, str(user.id), max_age=600, httponly=True, samesite="lax", path="/"
    )
    return response


@router.delete("/orcid/unlink")
async def orcid_unlink(user: User = Depends(get_current_user)):
    """Отвязать ORCID от текущего аккаунта. Требует пароль и подтверждённый email."""
    if not user.has_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="requires_password_first",
        )
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email_not_verified",
        )
    try:
        await AsyncOrm.unlink_orcid(user.id)
        return {"detail": "ORCID unlinked"}
    except ValueError as e:
        if str(e) == "requires_password_first":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="requires_password_first",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/orcid/callback")
async def orcid_callback(
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
):
    """Callback от ORCID: обмен code на токен, поиск/создание пользователя, редирект с JWT."""
    if error:
        frontend = settings.FRONTEND_URL.rstrip("/")
        return RedirectResponse(url=f"{frontend}/login?error=orcid_denied", status_code=302)

    cookie_state = request.cookies.get(ORCID_STATE_COOKIE)
    if not cookie_state or not state or cookie_state != state:
        frontend = settings.FRONTEND_URL.rstrip("/")
        return RedirectResponse(url=f"{frontend}/login?error=invalid_state", status_code=302)

    if not code:
        frontend = settings.FRONTEND_URL.rstrip("/")
        return RedirectResponse(url=f"{frontend}/login?error=no_code", status_code=302)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            settings.ORCID_TOKEN_URL,
            headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": settings.ORCID_CLIENT_ID,
                "client_secret": settings.ORCID_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.ORCID_REDIRECT_URI,
            },
        )

    if resp.status_code != 200:
        frontend = settings.FRONTEND_URL.rstrip("/")
        return RedirectResponse(url=f"{frontend}/login?error=token_exchange_failed", status_code=302)

    data = resp.json()
    orcid_raw = data.get("orcid")
    name = data.get("name", "")

    if not orcid_raw:
        frontend = settings.FRONTEND_URL.rstrip("/")
        return RedirectResponse(url=f"{frontend}/login?error=no_orcid", status_code=302)

    orcid = orcid_raw.replace("https://orcid.org/", "").strip()
    frontend = settings.FRONTEND_URL.rstrip("/")

    link_uid = request.cookies.get(ORCID_LINK_UID_COOKIE)
    if link_uid:
        try:
            user_id = int(link_uid)
            user = await AsyncOrm.get_user(user_id)
            if user:
                await AsyncOrm.link_orcid_to_user(user_id, orcid)
                response = RedirectResponse(url=f"{frontend}/profile?orcid=linked", status_code=302)
            else:
                response = RedirectResponse(
                    url=f"{frontend}/profile?error=link_failed&reason=user_not_found",
                    status_code=302,
                )
        except ValueError as e:
            err_msg = str(e)
            if "уже привязан" in err_msg or "already" in err_msg.lower():
                reason = "orcid_already_linked"
            else:
                reason = "link_failed"
            response = RedirectResponse(
                url=f"{frontend}/profile?error={reason}",
                status_code=302,
            )
        response.delete_cookie(ORCID_STATE_COOKIE, path="/")
        response.delete_cookie(ORCID_LINK_UID_COOKIE, path="/")
        return response

    user = await AsyncOrm.get_user_by_orcid(orcid)
    if user:
        token = _create_access_token(str(user.id))
        response = RedirectResponse(url=f"{frontend}/auth/callback?token={token}", status_code=302)
    else:
        name_enc = quote(name, safe="")
        response = RedirectResponse(
            url=f"{frontend}/register/orcid?orcid={orcid}&name={name_enc}",
            status_code=302,
        )

    response.delete_cookie(ORCID_STATE_COOKIE, path="/")
    return response


@router.post("/orcid/complete", response_model=TokenResponse)
async def orcid_complete(payload: OrcidCompleteRequest):
    """Дорегистрация: создать пользователя по ORCID + email + роль, выдать JWT и отправить письмо верификации."""
    try:
        user = await AsyncOrm.create_user_orcid(
            mail=payload.mail,
            orcid=payload.orcid,
            role_id=payload.role_id,
            full_name=payload.full_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    verify_token = await AsyncOrm.create_verification_token(user.id)
    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={verify_token}"
    await asyncio.to_thread(send_verification_email, user.mail, verify_url)
    token = _create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=user_to_read(user))
