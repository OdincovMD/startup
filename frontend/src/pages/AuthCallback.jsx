import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Токен не получен");
      return;
    }
    const finishAuth = async () => {
      try {
        await loginWithToken(token);
        navigate("/profile", { replace: true });
      } catch (e) {
        setError(e.message || "Ошибка загрузки профиля");
      }
    };
    finishAuth();
  }, [searchParams, navigate, loginWithToken]);

  if (error) {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern">
            <h1>Ошибка входа</h1>
            <p className="auth-subtitle">{error}</p>
            <Link to="/login" className="primary-btn auth-btn-primary" style={{ display: "inline-block", textAlign: "center", width: "100%", boxSizing: "border-box" }}>
              Вернуться на страницу входа
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main auth-page">
      <div className="auth-wrapper">
        <div className="auth-card-modern">
          <h1>Вход выполнен</h1>
          <p className="auth-subtitle">Перенаправление в профиль...</p>
        </div>
      </div>
    </main>
  );
}
