/**
 * Компактная карточка пользователя для сайдбара профиля.
 * Аватар, имя, роль/email.
 */
import React, { useRef } from "react";
import { Card } from "../../components/ui/Card";

export default function ProfileSummary({
  profile,
  roleName,
  onAvatarUpload,
  uploading,
  loading,
}) {
  const avatarInputRef = useRef(null);
  const initial = profile?.full_name?.[0]?.toUpperCase() || profile?.mail?.[0]?.toUpperCase() || "?";

  if (loading) {
    return (
      <Card variant="solid" padding="md">
        <div className="profile-summary-compact">
          <div className="profile-skeleton profile-summary-compact__avatar--skeleton" />
          <div className="profile-summary-compact__info" style={{ flex: 1 }}>
            <div className="profile-skeleton" style={{ height: 20, width: "70%", marginBottom: 8 }} />
            <div className="profile-skeleton" style={{ height: 14, width: "50%" }} />
          </div>
        </div>
      </Card>
    );
  }

  if (!profile) return null;

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

  return (
    <Card variant="solid" padding="md">
      <div className="profile-summary-compact">
        <button
          type="button"
          className={`profile-summary-compact__avatar profile-summary-compact__avatar--clickable ${uploading ? "profile-summary-compact__avatar--uploading" : ""}`}
          onClick={handleAvatarClick}
          disabled={uploading}
          aria-label="Сменить фото профиля"
        >
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt="Аватар" />
          ) : (
            <span className="profile-summary-compact__initial">{initial}</span>
          )}
          {onAvatarUpload && (
            <span className="profile-summary-compact__overlay">
              {uploading ? "..." : "📷"}
            </span>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
        </button>
        <div className="profile-summary-compact__info">
          <h3 className="profile-summary-compact__name">
            {profile?.full_name?.trim() || profile?.mail || "Профиль"}
          </h3>
          <p className="profile-summary-compact__role" style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
            {roleName || profile?.mail}
          </p>
        </div>
      </div>
    </Card>
  );
}
