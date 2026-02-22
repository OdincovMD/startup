import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function ForgotPassword() {
  const { auth } = useAuth();
  const [mail, setMail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState(null);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    const userMail = auth?.user?.mail?.trim();
    if (!userMail || hasAutoSent.current) return;
    hasAutoSent.current = true;
    setMail(userMail);
    setStatus("sending");
    (async () => {
      try {
        await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ mail: userMail }),
        });
        setStatus("sent");
      } catch (e) {
        setStatus("error");
        setErrorMessage(e.message || "Произошла ошибка. Попробуйте позже.");
        hasAutoSent.current = false;
      }
    })();
  }, [auth?.user?.mail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatus("sending");
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ mail: mail.trim() }),
      });
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e.message || "Произошла ошибка. Попробуйте позже.");
    }
  };

  if (status === "sent") {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern">
            <h1>Проверьте почту</h1>
            <p className="auth-subtitle">
              {auth?.user?.mail
                ? `На ${auth.user.mail} отправлено письмо с инструкциями для сброса пароля.`
                : "Если аккаунт с таким email существует и подтверждён, на него отправлено письмо с инструкциями для сброса пароля."}
            </p>
            <div className="auth-actions">
              <Link to="/profile" className="primary-btn auth-btn-primary auth-actions__primary">
                В профиль
              </Link>
              <div className="auth-actions__secondary">
                <Link to="/login">Выйти</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (status === "sending" && auth?.user?.mail) {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern auth-card-modern--loading">
            <h1>Сброс пароля</h1>
            <p className="auth-subtitle">Отправляем письмо на <strong>{auth.user.mail}</strong>…</p>
            <div className="auth-loading-dots" aria-hidden="true">
              <span /><span /><span />
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
          <h1>Забыли пароль?</h1>
          <p className="auth-subtitle">
            Введите email вашего аккаунта. Мы отправим ссылку для сброса пароля на подтверждённый email.
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {status === "error" && errorMessage && (
              <div className="auth-alert auth-alert-error" role="alert">
                {errorMessage}
              </div>
            )}
            <div className="field-group">
              <label htmlFor="forgot-mail">Email</label>
              <input
                id="forgot-mail"
                type="email"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                placeholder="name@lab.org"
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-actions">
              <button type="submit" className="primary-btn auth-btn-primary auth-actions__primary" disabled={status === "sending"}>
                {status === "sending" ? "Отправка…" : "Отправить ссылку"}
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
