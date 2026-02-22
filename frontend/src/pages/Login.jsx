import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const ORCID_ERROR_MESSAGES = {
  orcid_denied: "Вы отменили вход через ORCID.",
  invalid_state: "Ошибка безопасности. Попробуйте снова.",
  no_code: "ORCID не вернул код авторизации.",
  token_exchange_failed: "Не удалось получить данные от ORCID.",
  no_orcid: "ORCID не вернул идентификатор.",
};

export default function Login() {
  const { login, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({ mail: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err && ORCID_ERROR_MESSAGES[err]) {
      setError(ORCID_ERROR_MESSAGES[err]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
    <main className="main auth-page">
      <div className="auth-wrapper">
        <div className="auth-card-modern">
          <h1>Вход в аккаунт</h1>
          <p className="auth-subtitle">
            Введите email и пароль, чтобы управлять профилем и организациями.
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                {error}
              </div>
            )}

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
              <input
                id="login-password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              className="primary-btn auth-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Вход…" : "Войти"}
            </button>

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
                src="https://orcid.org/sites/default/files/images/orcid_24x24.png"
                alt=""
                width="24"
                height="24"
              />
              Войти через ORCID
            </a>
          </form>

          <div className="auth-footer">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
