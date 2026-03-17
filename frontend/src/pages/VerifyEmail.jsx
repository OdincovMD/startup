import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { 
  SpinnerIcon, 
  CheckCircleIcon, 
  AlertCircleIcon 
} from "../components/auth";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth, updateUser } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [errorMessage, setErrorMessage] = useState(null);
  const didVerifyRef = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMessage("Ссылка недействительна: отсутствует токен.");
      return;
    }

    // Защита от повторных запросов в dev/StrictMode и при повторных рендерах
    if (didVerifyRef.current) {
      return;
    }
    didVerifyRef.current = true;

    const verify = async () => {
      try {
        const user = await apiRequest("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
          skipAuth: true,
        });
        const hasSession = !!auth?.token;
        if (hasSession && user?.id != null) {
          updateUser(user);
        }
        setStatus("success");
        // Редирект: с того же устройства — в профиль, с другого — на вход
        if (hasSession) {
          navigate("/profile", { replace: true });
        } else {
          navigate("/login?verified=1", { replace: true });
        }
      } catch (e) {
        let msg = e.message || "Ссылка недействительна или истекла.";
        if (msg.includes("Сессия истекла")) {
          msg =
            "Ссылка недействительна, истекла или уже была использована. " +
            "Если вы уже подтверждали email, просто войдите в аккаунт.";
        }
        setStatus("error");
        setErrorMessage(msg);
      }
    };
    verify();
  }, [searchParams, auth?.token, updateUser, navigate]);

  if (status === "loading") {
    return (
      <div className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon auth-icon-card__icon--loading">
            <SpinnerIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Подтверждение email</h1>
            <p className="auth-subtitle auth-subtitle--center">Проверяем ссылку…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon auth-icon-card__icon--success">
            <CheckCircleIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Email подтверждён</h1>
            <p className="auth-subtitle auth-subtitle--center">
              Теперь вам доступен полный функционал. Можете перейти в профиль или на главную.
            </p>
            <div className="auth-actions">
              <Link to="/profile" className="primary-btn auth-btn-primary auth-actions__primary">
                В профиль
              </Link>
              <div className="auth-actions__secondary">
                <Link to="/">На главную</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--centered">
      <div className="auth-icon-card">
        <div className="auth-icon-card__icon">
          <AlertCircleIcon />
        </div>
        <div className="auth-icon-card__body">
          <h1 className="auth-icon-card__title">Ошибка подтверждения</h1>
          <p className="auth-subtitle auth-subtitle--center">{errorMessage}</p>
          <div className="auth-actions">
            <Link to="/profile" className="primary-btn auth-btn-primary auth-actions__primary">
              В профиль
            </Link>
            <div className="auth-actions__secondary">
              <Link to="/login">Войти</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
