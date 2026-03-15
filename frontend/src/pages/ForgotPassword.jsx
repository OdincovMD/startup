import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { 
  LockIcon, 
  MailCheckIcon, 
  SpinnerIcon, 
  AuthAlert, 
  AuthButton 
} from "../components/auth";

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

  /* ── Sent state ── */
  if (status === "sent") {
    return (
      <div className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon auth-icon-card__icon--success">
            <MailCheckIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Проверьте почту</h1>
            <div className="auth-subtitle auth-subtitle--center">
              {effectiveMail
                ? <>На <strong>{effectiveMail}</strong> отправлено письмо с&nbsp;инструкциями по сбросу пароля.</>
                : "Если аккаунт с таким email существует и подтверждён, на него отправлено письмо с инструкциями."}
            </div>
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
      </div>
    );
  }

  /* ── Sending (auto-send for authenticated user) ── */
  if (status === "sending" && effectiveMail) {
    return (
      <div className="auth-page auth-page--centered">
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
      </div>
    );
  }

  /* ── Idle / Error state (main form) ── */
  return (
    <div className="auth-page auth-page--centered">
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

          <AuthAlert message={errorMessage} />

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

            <AuthButton
              loading={status === "sending"}
              disabled={cooldownLeft > 0 || (!isAuthenticated && !mail.trim())}
            >
              {cooldownLeft > 0
                ? `Повторить через ${formatCountdown(cooldownLeft)}`
                : "Отправить ссылку"}
            </AuthButton>
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
    </div>
  );
}
