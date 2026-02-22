import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const RESEND_COOLDOWN_SEC = 60;

/**
 * Для маршрутов, требующих подтверждённый email: если пользователь не подтвердил email,
 * показываем заглушку с кнопкой «Запросить подтверждение» и ссылкой в профиль.
 */
export default function EmailVerifiedGate({ children }) {
  const { auth } = useAuth();
  const location = useLocation();
  const [resendStatus, setResendStatus] = useState(null); // null | sending | sent | error
  const [resendCooldownUntil, setResendCooldownUntil] = useState(null);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendCooldownUntil || resendCooldownUntil <= Date.now()) {
      setCooldownSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((resendCooldownUntil - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownSecondsLeft(0);
        setResendCooldownUntil(null);
        return;
      }
      setCooldownSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resendCooldownUntil]);

  const path = location.pathname;
  const restricted =
    path.startsWith("/organizations") ||
    path.startsWith("/laboratories") ||
    path.startsWith("/queries") ||
    path.startsWith("/vacancies");

  const needGate = auth?.user && auth.user.email_verified !== true && restricted;

  const handleResend = async () => {
    if (cooldownSecondsLeft > 0) return;
    setResendStatus("sending");
    try {
      await apiRequest("/auth/resend-verification", { method: "POST" });
      setResendStatus("sent");
      setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_SEC * 1000);
    } catch (e) {
      setResendStatus("error");
    }
  };

  if (!needGate) return children;

  return (
    <main className="main auth-page">
      <div className="auth-wrapper">
        <div className="auth-card-modern">
          <h1>Подтвердите email</h1>
          <p className="auth-subtitle">
            Для доступа к этому разделу нужно подтвердить адрес электронной почты.
            Перейдите в профиль и запросите письмо с ссылкой для подтверждения.
          </p>
          {resendStatus === "sent" && (
            <div className="auth-alert auth-alert-success" role="status">
              Письмо отправлено. Проверьте почту.
            </div>
          )}
          {resendStatus === "error" && (
            <div className="auth-alert auth-alert-error" role="alert">
              Не удалось отправить письмо. Попробуйте позже.
            </div>
          )}
          <div className="auth-actions">
            <button
              type="button"
              className="primary-btn auth-btn-primary auth-actions__primary"
              onClick={handleResend}
              disabled={resendStatus === "sending" || cooldownSecondsLeft > 0}
            >
              {resendStatus === "sending"
                ? "Отправка…"
                : cooldownSecondsLeft > 0
                  ? `Запросить ещё раз (${cooldownSecondsLeft} сек)`
                  : resendStatus === "sent"
                    ? "Запросить ещё раз"
                    : "Запросить подтверждение"}
            </button>
            <div className="auth-actions__secondary">
              <Link to="/profile">В профиль</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
