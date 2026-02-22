import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * Установка пароля для пользователя, зарегистрированного через ORCID (уже в системе, без отправки письма).
 * Та же форма, что и сброс пароля; вызов POST /auth/me/set-password.
 */
export default function SetPassword() {
  const { auth, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (auth === null) {
      navigate("/login", { replace: true });
    }
  }, [auth, navigate]);

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
      await apiRequest("/auth/me/set-password", {
        method: "POST",
        body: JSON.stringify({
          password,
          password_confirm: passwordConfirm,
        }),
      });
      await refreshUser();
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e.message || "Не удалось установить пароль.");
    }
  };

  if (auth === null) {
    return null;
  }

  if (status === "success") {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern">
            <h1>Пароль установлен</h1>
            <p className="auth-subtitle">
              Теперь вы можете входить по email и паролю.
            </p>
            <div className="auth-actions">
              <Link to="/profile" className="primary-btn auth-btn-primary auth-actions__primary">
                В профиль
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
          <h1>Установка пароля</h1>
          <p className="auth-subtitle">
            Вы зарегистрировались через ORCID. Введите пароль для входа по email (не менее 8 символов).
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {status === "error" && errorMessage && (
              <div className="auth-alert auth-alert-error" role="alert">
                {errorMessage}
              </div>
            )}
            <div className="field-group">
              <label htmlFor="set-password">Новый пароль</label>
              <input
                id="set-password"
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
              <label htmlFor="set-password-confirm">Повторите пароль</label>
              <input
                id="set-password-confirm"
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
                <Link to="/profile">Вернуться в профиль</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
