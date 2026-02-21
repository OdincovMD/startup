import React, { useRef, useState } from "react";
import OrcidProfileSection from "./OrcidProfileSection";
import OpenAlexProfileSection from "./OpenAlexProfileSection";
import { formatPhoneRU } from "../../utils/validation";
import { apiRequest } from "../../api/client";

export default function ProfileSummary({
  loading,
  error,
  profile,
  roleName,
  roles,
  selectedRoleId,
  onRoleChange,
  onRoleSave,
  roleSaving,
  roleLabelByName,
  orcidError,
  orcidLinked,
  onOrcidLinked,
  onOrcidErrorDismiss,
  onOpenAlexLinked,
  onAvatarUpload,
  uploading,
}) {
  const avatarInputRef = useRef(null);
  const initial = profile?.full_name?.[0]?.toUpperCase() || profile?.mail?.[0]?.toUpperCase() || "?";
  const contacts = profile?.contacts || {};

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", password_confirm: "" });
  const [passwordFormError, setPasswordFormError] = useState(null);
  const [settingPassword, setSettingPassword] = useState(false);

  const hasOrcid = Boolean(profile?.orcid);
  const hasPassword = profile?.has_password !== false;
  const needsPasswordSetup = hasOrcid && !hasPassword;

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordFormError(null);
    if (passwordForm.password.length < 8) {
      setPasswordFormError("Пароль должен быть не короче 8 символов");
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirm) {
      setPasswordFormError("Пароли не совпадают");
      return;
    }
    setSettingPassword(true);
    try {
      await apiRequest("/auth/me/set-password", {
        method: "POST",
        body: JSON.stringify({
          password: passwordForm.password,
          password_confirm: passwordForm.password_confirm,
        }),
      });
      setPasswordForm({ password: "", password_confirm: "" });
      setShowPasswordForm(false);
      onOrcidLinked?.();
    } catch (e) {
      setPasswordFormError(e.message);
    } finally {
      setSettingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onAvatarUpload) {
      onAvatarUpload(file);
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="profile-summary-card">
        <div className="profile-summary-header">
          <div className="profile-skeleton profile-summary-avatar--skeleton" />
          <div className="profile-summary-info" style={{ flex: 1 }}>
            <div className="profile-skeleton" style={{ height: 24, width: "60%", marginBottom: 8 }} />
            <div className="profile-skeleton" style={{ height: 16, width: "40%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fieldItems = [
    { key: "email", label: "Email", value: profile.mail },
    { key: "phone", label: "Телефон", value: contacts.phone ? formatPhoneRU(contacts.phone) : null },
    { key: "telegram", label: "Telegram", value: contacts.telegram },
  ].filter((f) => f.value);

  return (
    <div className="profile-summary-card">
      <div className="profile-summary-header">
        <button
          type="button"
          className={`profile-summary-avatar profile-summary-avatar--clickable ${uploading ? "profile-summary-avatar--uploading" : ""}`}
          onClick={handleAvatarClick}
          disabled={uploading}
          aria-label="Сменить фото профиля"
        >
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="Аватар" />
          ) : (
            <span className="profile-summary-avatar__initial">{initial}</span>
          )}
          <span className="profile-summary-avatar__overlay">
            {uploading ? "..." : "📷"}
          </span>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
        </button>
        <div className="profile-summary-info">
          <h2 className="profile-summary-name">
            {profile.full_name?.trim() || profile.mail || "Профиль"}
          </h2>
          <div className="profile-summary-meta">
            <span className="profile-summary-role-badge">{roleName}</span>
            {profile.email_verified !== undefined && (
              <>
                <span className="profile-summary-meta__sep">•</span>
                <span className={profile.email_verified ? "profile-summary-meta--verified" : "profile-summary-meta--unverified"}>
                  {profile.email_verified ? "Email подтверждён" : "Email не подтверждён"}
                </span>
              </>
            )}
          </div>
          {fieldItems.length > 0 && (
            <ul className="profile-summary-fields">
              {fieldItems.map((f) => (
                <li key={f.key} className="profile-summary-field">
                  <span className="profile-summary-field__label">{f.label}:</span>
                  {f.isLink ? (
                    <a
                      href={f.value.startsWith("http") ? f.value : `https://${f.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-summary-field__value profile-summary-field__value--link"
                    >
                      {f.value}
                    </a>
                  ) : (
                    <span className="profile-summary-field__value">{f.value}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {roles?.length > 0 && (
        <div className="profile-summary-role-block">
          <span className="profile-summary-block-label">Роль</span>
          <div className="inline-form profile-summary-role-form">
            <select
              value={selectedRoleId ?? ""}
              onChange={(e) => onRoleChange(e.target.value)}
              className="profile-summary-role-select"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabelByName?.(role.name) ?? role.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primary-btn"
              onClick={onRoleSave}
              disabled={roleSaving || selectedRoleId === String(profile.role_id)}
            >
              {roleSaving ? "Сохраняем..." : "Сохранить роль"}
            </button>
          </div>
        </div>
      )}

      {profile && (
        <div className="profile-summary-integrations">
          <span className="profile-summary-block-label">Научные профили</span>
          <p className="profile-summary-integrations-desc">
            ORCID и OpenAlex для отображения публикаций и идентификации.
          </p>
          <div className="profile-integration-cards">
            <OrcidProfileSection
              profile={profile}
              orcidError={orcidError}
              orcidLinked={orcidLinked}
              onOrcidLinked={onOrcidLinked}
              onOrcidErrorDismiss={onOrcidErrorDismiss}
              compact
              hidePasswordForm
            />
            <OpenAlexProfileSection profile={profile} onOpenAlexLinked={onOpenAlexLinked} compact />
          </div>
        </div>
      )}

      {needsPasswordSetup && (
        <div className="profile-summary-password-block">
          <span className="profile-summary-block-label">Установка пароля</span>
          <p className="profile-summary-integrations-desc">
            Вы зарегистрировались через ORCID. Установите пароль, чтобы иметь альтернативный способ входа.
          </p>
          {!showPasswordForm ? (
            <button
              type="button"
              className="profile-password-btn"
              onClick={() => setShowPasswordForm(true)}
            >
              <span className="profile-password-btn__icon">🔐</span>
              Установить пароль
            </button>
          ) : (
            <div className="profile-password-card">
              <form onSubmit={handleSetPassword} className="profile-password-form-modern">
                <div className="field-group">
                  <label htmlFor="new-password">Новый пароль</label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="Минимум 8 символов"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                    className={passwordFormError ? "error" : ""}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="confirm-password">Подтвердите пароль</label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Повторите пароль"
                    value={passwordForm.password_confirm}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, password_confirm: e.target.value }))}
                    className={passwordFormError ? "error" : ""}
                    autoComplete="new-password"
                  />
                </div>
                {passwordFormError && (
                  <div className="auth-alert auth-alert-error">{passwordFormError}</div>
                )}
                <div className="profile-password-form-actions">
                  <button type="submit" className="profile-password-submit" disabled={settingPassword}>
                    {settingPassword ? "Сохранение..." : "Сохранить пароль"}
                  </button>
                  <button
                    type="button"
                    className="profile-password-cancel"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordFormError(null);
                      setPasswordForm({ password: "", password_confirm: "" });
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
