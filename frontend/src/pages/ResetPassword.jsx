import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    if (password.length < 8) {
      setErrorMessage("Пароль должен быть не короче 8 символов");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("Пароли не совпадают");
      return;
    }
    setStatus("sending");
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          password,
          password_confirm: passwordConfirm,
        }),
      });
      logout();
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e.message || "Ссылка недействительна или истекла. Запросите сброс пароля снова.");
    }
  };

  if (!token) {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern">
            <h1>Недействительная ссылка</h1>
            <p className="auth-subtitle">
              В ссылке отсутствует токен. Запросите сброс пароля на странице входа.
            </p>
            <div className="auth-actions">
              <Link to="/forgot-password" className="primary-btn auth-btn-primary auth-actions__primary">
                Запросить сброс пароля
              </Link>
              <div className="auth-actions__secondary">
                <Link to="/login">Вход</Link>
              </div>
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
            <h1>Пароль изменён</h1>
            <p className="auth-subtitle">
              Теперь вы можете войти с новым паролем.
            </p>
            <div className="auth-actions">
              <Link to="/login" className="primary-btn auth-btn-primary auth-actions__primary">
                Войти
              </Link>
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
          <h1>Новый пароль</h1>
          <p className="auth-subtitle">
            Введите новый пароль (не менее 8 символов).
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {status === "error" && errorMessage && (
              <div className="auth-alert auth-alert-error" role="alert">
                {errorMessage}
              </div>
            )}
            <div className="field-group">
              <label htmlFor="reset-password">Новый пароль</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
                autoComplete="new-password"
              />
              <span className="auth-hint-inline">Не менее 8 символов</span>
            </div>
            <div className="field-group">
              <label htmlFor="reset-password-confirm">Повторите пароль</label>
              <input
                id="reset-password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="auth-actions">
              <button type="submit" className="primary-btn auth-btn-primary auth-actions__primary" disabled={status === "sending"}>
                {status === "sending" ? "Сохранение…" : "Сохранить пароль"}
              </button>
              <div className="auth-actions__secondary">
                <Link to="/login">Вернуться к входу</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
