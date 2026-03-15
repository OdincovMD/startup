import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { 
  LockIcon, 
  CheckCircleIcon, 
  AuthAlert, 
  AuthButton, 
  PasswordField 
} from "../components/auth";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
      <div className="auth-page auth-page--centered">
        <div className="auth-icon-card">
          <div className="auth-icon-card__icon auth-icon-card__icon--success">
            <CheckCircleIcon />
          </div>
          <div className="auth-icon-card__body">
            <h1 className="auth-icon-card__title">Пароль установлен</h1>
            <p className="auth-subtitle auth-subtitle--center">
              Теперь вы можете входить по email и паролю.
            </p>
            <div className="auth-actions">
              <Link to="/profile" className="primary-btn auth-btn-primary auth-actions__primary">
                В профиль
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
          <h1 className="auth-icon-card__title">Установка пароля</h1>
          <p className="auth-subtitle auth-subtitle--center">
            Вы зарегистрировались через ORCID. Введите пароль для входа по email (не менее 8 символов).
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            <AuthAlert message={errorMessage} />
            
            <PasswordField
              id="set-password"
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
              id="set-password-confirm"
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
                <Link to="/profile">Вернуться в профиль</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
