import React, { useState } from "react";
import { isValidEmail, formatPhoneRU } from "../../utils/validation";

export default function PersonalProfileSection({
  profile,
  onChange,
  onContactsChange,
  onSave,
  saving,
  hideTitle = false,
}) {
  const contacts = profile?.contacts || {};
  const [emailError, setEmailError] = useState(null);

  const contactEmail = contacts.email || profile?.mail || "";

  const handleEmailChange = (value) => {
    onContactsChange("email", value);
    setEmailError(null);
  };

  const handleEmailBlur = () => {
    const email = contactEmail.trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Введите корректный email");
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhoneRU(value);
    onContactsChange("phone", formatted);
  };

  const handleSave = () => {
    const email = contactEmail.trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Введите корректный email");
      return;
    }
    setEmailError(null);
    onSave();
  };

  return (
    <div className="profile-section profile-section--no-border">
      {!hideTitle && <h3 className="profile-section-title">Личные данные</h3>}
      <p className="profile-section-desc">ФИО и контакты для связи с вами</p>
      <div className="profile-form">
        <label>
          ФИО
          <input
            value={profile?.full_name || ""}
            onChange={(e) => onChange("full_name", e.target.value)}
            placeholder="Фамилия Имя Отчество"
          />
        </label>
        <div className="profile-form" style={{ gap: "0.75rem" }}>
          <label>
            Email для связи
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="email@example.com"
              autoComplete="email"
              className={emailError ? "error" : ""}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            {emailError && (
              <span id="email-error" className="profile-field-error">
                {emailError}
              </span>
            )}
          </label>
          <label>
            Телефон
            <input
              type="tel"
              value={contacts.phone ? formatPhoneRU(contacts.phone) : ""}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              maxLength={18}
            />
            <span className="profile-field-hint">Формат: +7 (999) 123-45-67</span>
          </label>
          <label>
            Telegram
            <input
              value={contacts.telegram || ""}
              onChange={(e) => onContactsChange("telegram", e.target.value)}
              placeholder="@username"
            />
          </label>
        </div>
        <button
          className="primary-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: "0.5rem", alignSelf: "flex-start" }}
        >
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
