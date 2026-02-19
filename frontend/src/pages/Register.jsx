import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register, login, loading } = useAuth();
  const [form, setForm] = useState({ mail: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
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
      await register({ ...form, role_id: 1 });
      await login({ mail: form.mail, password: form.password });
      navigate("/profile");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <main className="main auth-page">
      <div className="auth-wrapper">
        <div className="auth-card-modern">
          <h1>Регистрация</h1>
          <p className="auth-subtitle">
            Создайте аккаунт, чтобы публиковать вакансии и откликаться на проекты.
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                {error}
              </div>
            )}

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
                className={error && (error.includes("email") || error.includes("корректный")) ? "error" : ""}
              />
            </div>

            <div className="field-group">
              <label htmlFor="reg-password">Пароль</label>
              <input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Минимум 8 символов"
                minLength={8}
                required
                autoComplete="new-password"
              />
              <span className="auth-hint-inline">Не менее 8 символов</span>
            </div>

            <button
              className="auth-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
            </button>
          </form>

          <div className="auth-footer">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
