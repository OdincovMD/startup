import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const COOLDOWN_SEC = 120;
const COOLDOWN_STORAGE_KEY = "forgot_password_cooldown_until";

function getCooldownSecondsLeft() {
  const until = parseInt(localStorage.getItem(COOLDOWN_STORAGE_KEY) || "0", 10);
  if (!until || Date.now() >= until) return 0;
  return Math.ceil((until - Date.now()) / 1000);
}

function setCooldown() {
  localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + COOLDOWN_SEC * 1000));
}

function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ForgotPassword() {
  const { auth } = useAuth();
  const [mail, setMail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(() => getCooldownSecondsLeft());
  const hasAutoSent = useRef(false);

  const isAuthenticated = !!auth?.token;
  const effectiveMail = (isAuthenticated ? auth?.user?.mail?.trim() : mail.trim()) || "";

  useEffect(() => {
    if (isAuthenticated && auth?.user?.mail?.trim() && !hasAutoSent.current && getCooldownSecondsLeft() <= 0) {
      hasAutoSent.current = true;
      setStatus("sending");
      (async () => {
        try {
          await apiRequest("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ mail: auth.user.mail.trim() }),
          });
          setCooldown();
          setStatus("sent");
        } catch (e) {
          setStatus("error");
          setErrorMessage(e.message || "Произошла ошибка. Попробуйте позже.");
          if (e.message?.includes("2 минут")) {
            setCooldown();
            setCooldownLeft(getCooldownSecondsLeft());
          }
          hasAutoSent.current = false;
        }
      })();
    }
  }, [isAuthenticated, auth?.user?.mail]);

  useEffect(() => {
    setCooldownLeft(getCooldownSecondsLeft());
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      const left = getCooldownSecondsLeft();
      setCooldownLeft(left);
      if (left <= 0) localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldownLeft > 0) return;
    const email = effectiveMail;
    if (!email) return;
    setErrorMessage(null);
    setStatus("sending");
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ mail: email }),
      });
      setCooldown();
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e.message || "Произошла ошибка. Попробуйте позже.");
      if (e.message?.includes("2 минут")) {
        setCooldown();
        setCooldownLeft(getCooldownSecondsLeft());
      }
    }
  };

  if (status === "sent") {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern">
            <h1>Проверьте почту</h1>
            <p className="auth-subtitle">
              {effectiveMail
                ? `На ${effectiveMail} отправлено письмо с инструкциями для сброса пароля.`
                : "Если аккаунт с таким email существует и подтверждён, на него отправлено письмо с инструкциями для сброса пароля."}
            </p>
            <div className="auth-actions">
              <Link
                to={isAuthenticated ? "/profile" : "/login"}
                className="primary-btn auth-btn-primary auth-actions__primary"
              >
                {isAuthenticated ? "В профиль" : "К входу"}
              </Link>
              {!isAuthenticated && (
                <div className="auth-actions__secondary">
                  <Link to="/login">Вернуться к входу</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (status === "sending" && effectiveMail) {
    return (
      <main className="main auth-page">
        <div className="auth-wrapper">
          <div className="auth-card-modern auth-card-modern--loading">
            <h1>Сброс пароля</h1>
            <p className="auth-subtitle">Отправляем письмо на <strong>{effectiveMail}</strong>…</p>
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
            {isAuthenticated
              ? "Мы отправим ссылку для сброса пароля на ваш подтверждённый email."
              : "Введите email вашего аккаунта. Мы отправим ссылку для сброса пароля на подтверждённый email."}
          </p>
          {status === "error" && errorMessage && (
            <div className="auth-alert auth-alert-error" role="alert">
              {errorMessage}
            </div>
          )}
          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {!isAuthenticated && (
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
            )}
            <div className="auth-actions">
              <button
                type="submit"
                className="primary-btn auth-btn-primary auth-actions__primary"
                disabled={status === "sending" || cooldownLeft > 0 || (!isAuthenticated && !mail.trim())}
              >
                {status === "sending"
                  ? "Отправка…"
                  : cooldownLeft > 0
                    ? `Через ${formatCountdown(cooldownLeft)}`
                    : "Отправить ссылку"}
              </button>
              <div className="auth-actions__secondary">
                <Link to={isAuthenticated ? "/profile" : "/login"}>
                  {isAuthenticated ? "В профиль" : "Вернуться к входу"}
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
