import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth, refreshUser, updateUser } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMessage("Ссылка недействительна: отсутствует токен.");
      return;
    }
    let cancelled = false;
    const verify = async () => {
      try {
        const user = await apiRequest("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (!cancelled && auth?.token) {
          if (user?.id != null) {
            updateUser(user);
          } else {
            await refreshUser();
          }
        }
        if (!cancelled) setStatus("success");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(e.message || "Ссылка недействительна или истекла.");
        }
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [searchParams, auth?.token, refreshUser]);

  if (status === "loading") {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern auth-card-modern--loading">
            <h1>Подтверждение email</h1>
            <p className="auth-subtitle">Проверяем ссылку…</p>
            <div className="auth-loading-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern">
            <h1>Email подтверждён</h1>
            <p className="auth-subtitle">
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
      </main>
    );
  }

  return (
    <main className="main auth-page">
      <div className="auth-wrapper">
        <div className="auth-card-modern">
          <h1>Ошибка подтверждения</h1>
          <p className="auth-subtitle">{errorMessage}</p>
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
    </main>
  );
}
