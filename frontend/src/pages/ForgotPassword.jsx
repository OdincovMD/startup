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

const LockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const MailCheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    <path d="m16 19 2 2 4-4" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="auth-icon-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

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

  /* ── Sent state ── */
  if (status === "sent") {
    return (
      <main className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon auth-icon-card__icon--success">
            <MailCheckIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Проверьте почту</h1>
            <p className="auth-subtitle auth-subtitle--center">
              {effectiveMail
                ? <>На <strong>{effectiveMail}</strong> отправлено письмо с&nbsp;инструкциями по сбросу пароля.</>
                : "Если аккаунт с таким email существует и подтверждён, на него отправлено письмо с инструкциями."}
            </p>
            <p className="auth-icon-card__hint">
              Не нашли письмо? Проверьте папку «Спам».
            </p>
            <Link
              to={isAuthenticated ? "/profile" : "/login"}
              className="primary-btn auth-btn-primary"
            >
              {isAuthenticated ? "В профиль" : "Вернуться к входу"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── Sending (auto-send for authenticated user) ── */
  if (status === "sending" && effectiveMail) {
    return (
      <main className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon auth-icon-card__icon--loading">
            <SpinnerIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Сброс пароля</h1>
            <p className="auth-subtitle auth-subtitle--center">
              Отправляем письмо на&nbsp;<strong>{effectiveMail}</strong>…
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ── Idle / Error state (main form) ── */
  return (
    <main className="auth-page auth-page--centered">
      <div className="auth-icon-card">
        <div className="auth-icon-card__icon">
          <LockIcon />
        </div>
        <div className="auth-icon-card__body">
          <h1 className="auth-icon-card__title">Забыли пароль?</h1>
          <p className="auth-subtitle auth-subtitle--center">
            {isAuthenticated
              ? "Отправим ссылку для сброса пароля на ваш подтверждённый email."
              : "Введите email аккаунта — мы пришлём ссылку для сброса пароля."}
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
                  onChange={(e) => { setMail(e.target.value); setErrorMessage(null); }}
                  placeholder="name@lab.org"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            )}

            <button
              type="submit"
              className="primary-btn auth-btn-primary"
              disabled={status === "sending" || cooldownLeft > 0 || (!isAuthenticated && !mail.trim())}
            >
              {status === "sending"
                ? <span className="auth-btn-spinner"><span /><span /><span /></span>
                : cooldownLeft > 0
                  ? `Повторить через ${formatCountdown(cooldownLeft)}`
                  : "Отправить ссылку"}
            </button>
          </form>

          <div className="auth-icon-card__back">
            <Link to={isAuthenticated ? "/profile" : "/login"} className="auth-icon-card__back-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              {isAuthenticated ? "В профиль" : "Вернуться к входу"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
