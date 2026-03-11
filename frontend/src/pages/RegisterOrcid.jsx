import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { isValidEmail, safeDecodeParam } from "../utils/validation";
import { 
  AuthSplitLayout, 
  AuthAlert, 
  AuthButton, 
  AuthIconHeader 
} from "../components/auth";

const EMAIL_ERROR_PHRASES = ["email", "корректный"];
const hasEmailError = (error) =>
  error && EMAIL_ERROR_PHRASES.some((phrase) => error.includes(phrase));

const ORCID_ICON_URL = "https://orcid.org/sites/default/files/images/orcid_24x24.png";

export default function RegisterOrcid() {
  const [searchParams] = useSearchParams();
  const orcid = searchParams.get("orcid");
  const nameParam = searchParams.get("name") || "";

  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    mail: "",
    full_name: safeDecodeParam(nameParam),
  });
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | submitting | error

  useEffect(() => {
    if (!orcid) {
      navigate("/login", { replace: true });
    }
  }, [orcid, navigate]);

  const clearError = () => {
    setStatus("idle");
    setError(null);
  };

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
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const data = await apiRequest("/auth/orcid/complete", {
        method: "POST",
        body: JSON.stringify({
          orcid,
          mail: form.mail.trim(),
          full_name: form.full_name?.trim() || undefined,
        }),
      });
      await loginWithToken(data.access_token);
      navigate("/profile", { replace: true });
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  };

  if (!orcid) {
    return null;
  }

  const isLoading = status === "submitting";

  return (
    <AuthSplitLayout>
      <div className="auth-split__form-inner">
        <AuthIconHeader 
          icon={ORCID_ICON_URL}
          title="Завершение регистрации"
          subtitle="Вы вошли через ORCID. Укажите email для создания аккаунта."
        />

        <form className="auth-form-modern" onSubmit={handleSubmit}>
          <AuthAlert message={error} />

          <div className="field-group">
            <label htmlFor="orcid-reg-mail">Email</label>
            <input
              id="orcid-reg-mail"
              type="email"
              value={form.mail}
              onChange={(e) => handleChange("mail", e.target.value)}
              placeholder="name@lab.org"
              required
              autoFocus
              autoComplete="email"
              className={hasEmailError(error) ? "error" : ""}
            />
          </div>

          <div className="field-group">
            <label htmlFor="orcid-reg-fullname">Имя (необязательно)</label>
            <input
              id="orcid-reg-fullname"
              type="text"
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              placeholder="Иван Иванов"
              autoComplete="name"
            />
          </div>

          <AuthButton loading={isLoading}>
            Создать аккаунт
          </AuthButton>
        </form>
        <div className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
