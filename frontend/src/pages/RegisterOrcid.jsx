import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";

export default function RegisterOrcid() {
  const [searchParams] = useSearchParams();
  const orcid = searchParams.get("orcid");
  const name = searchParams.get("name") || "";

  const { loginWithToken } = useAuth();
  const safeName = (() => {
    if (!name) return "";
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  })();

  const [form, setForm] = useState({
    mail: "",
    full_name: safeName,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!orcid) {
      navigate("/login", { replace: true });
    }
  }, [orcid, navigate]);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const clearError = () => setError(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();
    if (!orcid) return;
    if (!isValidEmail(form.mail)) {
      setError("Введите корректный email");
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("/auth/orcid/complete", {
        method: "POST",
        body: JSON.stringify({
          orcid,
          mail: form.mail,
          full_name: form.full_name || undefined,
        }),
      });
      await loginWithToken(data.access_token);
      navigate("/profile", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!orcid) {
    return null;
  }

  return (
    <main className="main auth-page">
      <div className="auth-wrapper">
        <div className="auth-card-modern">
          <h1>Завершить регистрацию</h1>
          <p className="auth-subtitle">
            Вы вошли через ORCID. Укажите email для создания аккаунта. Роль можно выбрать в профиле.
          </p>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="field-group">
              <label htmlFor="orcid-reg-mail">Email</label>
              <input
                id="orcid-reg-mail"
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
              <label htmlFor="orcid-reg-fullname">Имя (по желанию)</label>
              <input
                id="orcid-reg-fullname"
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Иван Иванов"
                autoComplete="name"
              />
            </div>

            <button
              className="primary-btn auth-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Создаём аккаунт…" : "Завершить регистрацию"}
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
