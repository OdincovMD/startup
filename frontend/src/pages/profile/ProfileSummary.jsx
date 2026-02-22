import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import OrcidProfileSection from "./OrcidProfileSection";
import OpenAlexProfileSection from "./OpenAlexProfileSection";
import { formatPhoneRU } from "../../utils/validation";
import { apiRequest } from "../../api/client";

const RESEND_COOLDOWN_SEC = 60;

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

  const [resendVerifyStatus, setResendVerifyStatus] = useState(null); // null | sending | sent | error
  const [resendCooldownUntil, setResendCooldownUntil] = useState(null);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendCooldownUntil || resendCooldownUntil <= Date.now()) {
      setCooldownSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((resendCooldownUntil - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownSecondsLeft(0);
        setResendCooldownUntil(null);
        return;
      }
      setCooldownSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resendCooldownUntil]);

  const hasOrcid = Boolean(profile?.orcid);
  const hasPassword = profile?.has_password !== false;
  const needsPasswordSetup = hasOrcid && !hasPassword;

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

  const handleResendVerification = async () => {
    if (cooldownSecondsLeft > 0) return;
    setResendVerifyStatus("sending");
    try {
      await apiRequest("/auth/resend-verification", { method: "POST" });
      setResendVerifyStatus("sent");
      setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_SEC * 1000);
    } catch (e) {
      setResendVerifyStatus("error");
    }
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
      {profile.email_verified === false && (
        <div className="profile-summary-verify-banner">
          <p className="profile-summary-verify-banner__title">Подтвердите email</p>
          <p>Для полного доступа к разделам сайта нужно подтвердить адрес почты.</p>
          {resendVerifyStatus === "sent" && <p className="profile-summary-verify-banner--success">Письмо отправлено. Проверьте почту.</p>}
          {resendVerifyStatus === "error" && <p className="profile-summary-verify-banner--error">Не удалось отправить. Попробуйте позже.</p>}
          <div className="profile-summary-verify-banner__actions">
            <button
              type="button"
              className="profile-summary-verify-banner__btn"
              onClick={handleResendVerification}
              disabled={resendVerifyStatus === "sending" || cooldownSecondsLeft > 0}
            >
              {resendVerifyStatus === "sending"
                ? "Отправка…"
                : cooldownSecondsLeft > 0
                  ? `Запросить ещё раз (${cooldownSecondsLeft} сек)`
                  : resendVerifyStatus === "sent"
                    ? "Запросить ещё раз"
                    : "Запросить письмо"}
            </button>
          </div>
        </div>
      )}
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

      {profile?.has_password && (
        <div className="profile-summary-security">
          <Link to="/forgot-password" className="profile-summary-link">Сбросить пароль</Link>
        </div>
      )}

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

      {needsPasswordSetup && profile?.email_verified === true && (
        <div className="profile-summary-password-block">
          <span className="profile-summary-block-label">Установка пароля</span>
          <p className="profile-summary-integrations-desc">
            Вы зарегистрировались через ORCID. Установите пароль, чтобы иметь альтернативный способ входа.
          </p>
          <Link to="/set-password" className="profile-password-btn">
            <span className="profile-password-btn__icon">🔐</span>
            Установить пароль
          </Link>
        </div>
      )}
    </div>
  );
}
