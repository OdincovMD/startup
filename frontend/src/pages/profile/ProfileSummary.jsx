import React from "react";
import OrcidProfileSection from "./OrcidProfileSection";
import OpenAlexProfileSection from "./OpenAlexProfileSection";

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
}) {
  const initial = profile?.full_name?.[0]?.toUpperCase() || profile?.mail?.[0]?.toUpperCase() || "?";

  if (loading) {
    return (
      <div className="profile-summary-card">
        <div className="profile-skeleton" style={{ width: 56, height: 56, borderRadius: "50%" }} />
        <div className="profile-summary-info" style={{ flex: 1 }}>
          <div className="profile-skeleton" style={{ height: 24, width: "60%", marginBottom: 8 }} />
          <div className="profile-skeleton" style={{ height: 16, width: "40%" }} />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-summary-card">
      <div className="profile-summary-avatar">
        {profile.full_name || profile.mail ? (
          <span>{initial}</span>
        ) : (
          <span>?</span>
        )}
      </div>
      <div className="profile-summary-info">
        <h2 className="profile-summary-name">
          {profile.full_name?.trim() || profile.mail || "Профиль"}
        </h2>
        <div className="profile-summary-meta">
          <span>{profile.mail}</span>
          <span>•</span>
          <span className="profile-summary-role-badge">{roleName}</span>
          {profile.email_verified !== undefined && (
            <>
              <span>•</span>
              <span>{profile.email_verified ? "Email подтверждён" : "Email не подтверждён"}</span>
            </>
          )}
        </div>
        {roles?.length > 0 && (
          <div className="inline-form" style={{ marginTop: "0.75rem" }}>
            <select
              value={selectedRoleId ?? ""}
              onChange={(e) => onRoleChange(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                fontSize: "0.875rem",
              }}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabelByName?.(role.name) ?? role.name}
                </option>
              ))}
            </select>
            <button
              className="ghost-btn"
              onClick={onRoleSave}
              disabled={roleSaving || selectedRoleId === String(profile.role_id)}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.875rem" }}
            >
              {roleSaving ? "Сохраняем..." : "Сменить роль"}
            </button>
          </div>
        )}
        {profile && (
          <div className="profile-summary-integrations" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
            <OrcidProfileSection
              profile={profile}
              orcidError={orcidError}
              orcidLinked={orcidLinked}
              onOrcidLinked={onOrcidLinked}
              onOrcidErrorDismiss={onOrcidErrorDismiss}
              compact
            />
            <OpenAlexProfileSection profile={profile} onOpenAlexLinked={onOpenAlexLinked} compact />
          </div>
        )}
      </div>
      <div className="profile-summary-actions" />
    </div>
  );
}
