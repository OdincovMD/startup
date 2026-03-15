import React, { useState } from "react";
import { isValidEmail, formatPhoneRU } from "../../utils/validation";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  TelegramIcon 
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
    <div className="profile-form-section">
      {!hideTitle && (
        <h2 className="profile-section-card__title">Личные данные</h2>
      )}
      <form
        className="profile-form profile-form--grouped"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="profile-form-group">
          <div className="profile-form-group-title">Основная информация</div>
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
          <div className="profile-form-group-title">Контактные данные</div>
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
          <Input
            id="contact_telegram"
            label="Telegram"
            value={contacts.telegram || ""}
            onChange={(e) => onContactsChange("telegram", e.target.value)}
            placeholder="@username"
            icon={<TelegramIcon />}
            className="mt-4"
          />
        </div>

        <div className="profile-actions-wrap">
          <Button variant="primary" type="submit" loading={saving}>
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </Button>
        </div>
      </form>
    </div>
  );
}
