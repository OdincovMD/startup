import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isValidEmail } from "../utils/validation";
import { 
  AuthSplitLayout, 
  PasswordField, 
  AuthAlert, 
  AuthButton, 
  AuthIconHeader 
} from "../components/auth";

const EMAIL_ERROR_PHRASES = ["email", "корректный"];
const hasEmailError = (error) =>
  error && EMAIL_ERROR_PHRASES.some((phrase) => error.includes(phrase));

const REGISTER_FORM_SUBTITLE = "Создайте аккаунт, чтобы публиковать вакансии и откликаться на проекты.";

export default function Register() {
  const { register, login, loading } = useAuth();
  const [form, setForm] = useState({
    mail: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const navigate = useNavigate();

  const clearError = () => setError(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();

    if (!isValidEmail(form.mail)) {
      setError("Введите корректный email");
      return;
    }
    if (form.password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    try {
      await register({ mail: form.mail, password: form.password, role_id: 1 });
      await login({ mail: form.mail, password: form.password });
      navigate("/profile?new_user=1");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="auth-split__form-inner">
        <AuthIconHeader 
          title="Регистрация" 
          subtitle={REGISTER_FORM_SUBTITLE} 
        />

        <form className="auth-form-modern auth-form-modern--stagger" onSubmit={handleSubmit}>
          <AuthAlert message={error} />

          <div className="field-group">
            <label htmlFor="reg-mail">Email</label>
            <input
              id="reg-mail"
              type="email"
              value={form.mail}
              onChange={(e) => handleChange("mail", e.target.value)}
              placeholder="name@lab.org"
              required
              autoComplete="email"
              className={hasEmailError(error) ? "error" : ""}
            />
          </div>

          <PasswordField
            id="reg-password"
            label="Пароль"
            value={form.password}
            onChange={(v) => handleChange("password", v)}
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
            hint="Не менее 8 символов"
            minLength={8}
            required
          />

          <PasswordField
            id="reg-password-confirm"
            label="Повторите пароль"
            value={form.passwordConfirm}
            onChange={(v) => handleChange("passwordConfirm", v)}
            showPassword={showPasswordConfirm}
            onToggleShow={() => setShowPasswordConfirm((v) => !v)}
            minLength={8}
            required
          />

          <AuthButton loading={loading}>
            Создать аккаунт
          </AuthButton>

          <div className="auth-divider">или</div>

          <a
            href="/api/auth/orcid"
            className="auth-btn-orcid"
            aria-label="Зарегистрироваться через ORCID"
          >
            <img
              src="https://orcid.org/sites/default/files/images/orcid_24x24.png"
              alt=""
              width="24"
              height="24"
            />
            Зарегистрироваться через ORCID
          </a>
        </form>

        <div className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
