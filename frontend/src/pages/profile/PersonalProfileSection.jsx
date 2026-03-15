import React, { useState } from "react";
import { User, Mail, Phone } from "lucide-react";
import { isValidEmail, formatPhoneRU } from "../../utils/validation";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  TelegramIcon,
} from "../../components/auth";

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
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header" style={{ marginBottom: "1.5rem" }}>
        <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <User size={24} color="var(--accent)" />
          <div>
            {!hideTitle && (
              <h2 className="profile-section-card__title" style={{ margin: 0, fontSize: "1.5rem" }}>
                Личные данные
              </h2>
            )}
            <p className="profile-section-desc" style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Ваша контактная и основная информация
            </p>
          </div>
        </div>
      </div>

      <form
        className="profile-form profile-form--grouped"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
      >
        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <User size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Основная информация
            </span>
          </div>
          <Input
            id="full_name"
            label="ФИО"
            value={profile?.full_name || ""}
            onChange={(e) => onChange("full_name", e.target.value)}
            placeholder="Фамилия Имя Отчество"
            icon={<UserIcon />}
          />
        </div>

        <div className="profile-form-group">
          <div className="section-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <Mail size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Контактные данные
            </span>
          </div>
          <div className="profile-form__row">
            <Input
              id="contact_email"
              label="Email для связи"
              type="email"
              value={contactEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="email@example.com"
              autoComplete="email"
              error={emailError}
              icon={<MailIcon />}
            />
            <Input
              id="contact_phone"
              label="Телефон"
              type="tel"
              value={contacts.phone ? formatPhoneRU(contacts.phone) : ""}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              maxLength={18}
              hint="Формат: +7 (999) 123-45-67"
              icon={<PhoneIcon />}
            />
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <Input
              id="contact_telegram"
              label="Telegram"
              value={contacts.telegram || ""}
              onChange={(e) => onContactsChange("telegram", e.target.value)}
              placeholder="@username"
              icon={<TelegramIcon />}
            />
          </div>
        </div>

        <div className="profile-actions-wrap-modern" style={{ display: "flex", gap: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "2rem", marginTop: "0" }}>
          <Button variant="primary" type="submit" loading={saving} disabled={saving} style={{ padding: "0.75rem 2.5rem" }}>
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
