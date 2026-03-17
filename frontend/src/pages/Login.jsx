import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  AuthSplitLayout, 
  AuthAlert, 
  AuthButton, 
  AuthIconHeader, 
  EyeOffIcon, 
  EyeOpenIcon,
  ORCID_ICON_URL
} from "../components/auth";
import { useAuth } from "../auth/AuthContext";
import { isValidEmail } from "../utils/validation";

const ORCID_ERROR_MESSAGES = {
  orcid_denied: "Вы отменили вход через ORCID.",
  invalid_state: "Ошибка безопасности. Попробуйте снова.",
  no_code: "ORCID не вернул код авторизации.",
  token_exchange_failed: "Не удалось получить данные от ORCID.",
  no_orcid: "ORCID не вернул идентификатор.",
  orcid_already_linked:
    "Этот ORCID уже привязан к другому аккаунту. Войдите в тот аккаунт, чтобы использовать его, или отвяжите ORCID там, чтобы привязать к текущему.",
};

const LOGIN_BRAND = {
  headline: "Вход в аккаунт",
  desc: "Введите email и пароль, чтобы управлять профилем и организациями.",
};

export default function Login() {
  const { login, loading, auth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({ mail: "", password: "" });
  const [error, setError] = useState(null);
  const [verifiedMessage, setVerifiedMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const err = searchParams.get("error");
    const verified = searchParams.get("verified");

    if (auth?.token && (err === "orcid_already_linked" || err === "invalid_state")) {
      setSearchParams({}, { replace: true });
      navigate("/profile?error=link_failed", { replace: true });
      return;
    }

    if (verified === "1") {
      setVerifiedMessage(true);
      setSearchParams({}, { replace: true });
    } else if (err && ORCID_ERROR_MESSAGES[err]) {
      setError(ORCID_ERROR_MESSAGES[err]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, auth, navigate]);

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
    try {
      await login(form);
      navigate("/profile");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="auth-split__form-inner">
        <AuthIconHeader 
          title={LOGIN_BRAND.headline} 
          subtitle={LOGIN_BRAND.desc} 
        />

        <form className="auth-form-modern auth-form-modern--stagger" onSubmit={handleSubmit}>
          {verifiedMessage && (
            <AuthAlert type="success" message="Email подтверждён. Войдите в аккаунт." />
          )}
          <AuthAlert message={error} />

          <div className="field-group">
            <label htmlFor="login-mail">Email</label>
            <input
              id="login-mail"
              type="email"
              value={form.mail}
              onChange={(e) => handleChange("mail", e.target.value)}
              placeholder="name@lab.org"
              required
              autoComplete="email"
              className={error && error.includes("email") ? "error" : ""}
            />
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Пароль</label>
            <div className="field-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="field-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </div>

          <AuthButton loading={loading}>
            Войти
          </AuthButton>

          <div className="auth-footer auth-footer--compact">
            <Link to="/forgot-password">Забыли пароль?</Link>
          </div>

          <div className="auth-divider">или</div>

          <a
            href="/api/auth/orcid"
            className="auth-btn-orcid"
            aria-label="Войти через ORCID"
          >
            <img
              src={ORCID_ICON_URL}
              alt=""
              width="24"
              height="24"
              aria-hidden
            />
            Войти через ORCID
          </a>
        </form>

        <div className="auth-footer">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
