import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { 
  LockIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  AuthAlert, 
  AuthButton, 
  PasswordField 
} from "../components/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
      <div className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon">
            <AlertCircleIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Недействительная ссылка</h1>
            <p className="auth-subtitle auth-subtitle--center">
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
            <h1 className="auth-icon-card__title">Пароль изменён</h1>
            <p className="auth-subtitle auth-subtitle--center">
              Теперь вы можете войти с новым паролем.
            </p>
            <div className="auth-actions">
              <Link to="/login" className="primary-btn auth-btn-primary auth-actions__primary">
                Войти
              </Link>
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
          <LockIcon />
        </div>
        <div className="auth-icon-card__body">
          <h1 className="auth-icon-card__title">Новый пароль</h1>
          <p className="auth-subtitle auth-subtitle--center">
            Введите новый пароль (не менее 8 символов).
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            <AuthAlert message={errorMessage} />
            
            <PasswordField
              id="reset-password"
              label="Новый пароль"
              value={password}
              onChange={(v) => { setPassword(v); setErrorMessage(null); }}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword(!showPassword)}
              placeholder="••••••••"
              minLength={8}
              required
              autoComplete="new-password"
              hint="Не менее 8 символов"
            />

            <PasswordField
              id="reset-password-confirm"
              label="Повторите пароль"
              value={passwordConfirm}
              onChange={(v) => { setPasswordConfirm(v); setErrorMessage(null); }}
              showPassword={showPasswordConfirm}
              onToggleShow={() => setShowPasswordConfirm(!showPasswordConfirm)}
              placeholder="••••••••"
              minLength={8}
              required
              autoComplete="new-password"
            />

            <div className="auth-actions">
              <AuthButton loading={status === "sending"} className="primary-btn auth-btn-primary auth-actions__primary">
                Сохранить пароль
              </AuthButton>
              <div className="auth-actions__secondary">
                <Link to="/login">Вернуться к входу</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
