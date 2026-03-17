/**
 * Компактная карточка пользователя для сайдбара профиля.
 * Аватар, имя, роль/email.
 */
import React, { useRef } from "react";
import { Camera } from "lucide-react";
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
      <Card variant="solid" padding="md" style={{ border: "1px solid var(--border-light)" }}>
        <div className="profile-summary-compact" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="profile-skeleton" style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--nav-active-bg)", animation: "pulse 2s infinite" }} />
          <div className="profile-summary-compact__info" style={{ flex: 1 }}>
            <div className="profile-skeleton" style={{ height: "18px", width: "70%", marginBottom: "8px", background: "var(--nav-active-bg)", borderRadius: "4px" }} />
            <div className="profile-skeleton" style={{ height: "14px", width: "50%", background: "var(--nav-active-bg)", borderRadius: "4px" }} />
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
    <Card variant="solid" padding="md" style={{ border: "1px solid var(--border-light)", background: "linear-gradient(to bottom right, #fff, var(--page-bg-alt))" }}>
      <div className="profile-summary-compact" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`profile-summary-compact__avatar ${uploading ? "uploading" : ""}`}
            onClick={handleAvatarClick}
            disabled={uploading}
            style={{ 
              width: "56px", 
              height: "56px", 
              borderRadius: "16px", 
              overflow: "hidden", 
              border: "2px solid #fff", 
              boxShadow: "0 4px 12px rgba(26, 35, 50, 0.1)",
              background: "var(--accent-bg)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyCenter: "center",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.2s"
            }}
          >
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: "1.5rem", fontWeight: 700, width: "100%", textAlign: "center" }}>{initial}</div>
            )}
            
            <div className="avatar-hover-overlay" style={{ position: "absolute", inset: 0, background: "rgba(26, 35, 50, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", color: "#fff" }}>
              <Camera size={18} />
            </div>
          </button>
          {uploading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
              <div className="loader-mini" style={{ width: "16px", height: "16px", border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            </div>
          )}
        </div>
        
        <div className="profile-summary-compact__info" style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile?.full_name?.trim() || "Пользователь"}
          </h3>
          <div style={{ marginTop: "0.125rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {roleName || "Роль не выбрана"}
            </span>
          </div>
        </div>
        
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
        />
      </div>
    </Card>
  );
}
