import React, { useRef, useEffect } from "react";
import { normalizeWebsiteInput } from "../../../utils/validation";
import OrgOpenAlexSection from "../OrgOpenAlexSection";

/**
 * Модуль «Профиль организации»: название, аватар, адрес, сайт, описание, сохранение и публикация.
 * Можно переиспользовать в других ролях.
 */
export default function OrgProfileTab({
  orgProfile,
  handleOrgChange,
  uploadOrgAvatar,
  uploading,
  saving,
  saveOrganization,
  toggleOrgPublish,
  onAvatarInputRefReady,
  onOrgRorLinked,
}) {
  const avatarInputRef = useRef(null);

  useEffect(() => {
    onAvatarInputRefReady?.(avatarInputRef);
  }, [onAvatarInputRefReady]);
  return (
    <div className="profile-form">
      <OrgOpenAlexSection orgProfile={orgProfile} onOrgRorLinked={onOrgRorLinked} />
      <label>
        Название организации
        <input
          value={orgProfile?.name || ""}
          onChange={(e) => handleOrgChange("name", e.target.value)}
          placeholder="Название"
        />
      </label>
      <label>
        Аватар организации
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => uploadOrgAvatar(e.target.files?.[0])}
          disabled={uploading || saving}
        />
      </label>
      {orgProfile?.avatar_url && (
        <div className="employee-photo">
          <img src={orgProfile.avatar_url} alt="Аватар организации" />
          <button className="file-remove" onClick={() => handleOrgChange("avatar_url", "")}>
            ×
          </button>
        </div>
      )}
      <label>
        Адрес
        <input
          value={orgProfile?.address || ""}
          onChange={(e) => handleOrgChange("address", e.target.value)}
          placeholder="Адрес"
        />
      </label>
      <label>
        Сайт
        <input
          type="url"
          value={orgProfile?.website || ""}
          onChange={(e) => handleOrgChange("website", e.target.value)}
          onBlur={(e) => {
            const v = (e.target.value || "").trim();
            if (v) handleOrgChange("website", normalizeWebsiteInput(v));
          }}
          placeholder="example.com или https://..."
        />
      </label>
      <label>
        Описание
        <textarea
          rows={4}
          value={orgProfile?.description || ""}
          onChange={(e) => handleOrgChange("description", e.target.value)}
          placeholder="Краткое описание организации"
        />
      </label>
      <div className="profile-actions">
        <button className="primary-btn" onClick={saveOrganization} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
        {orgProfile && orgProfile.name && (
          <button
            className={orgProfile.is_published ? "ghost-btn secondary" : "ghost-btn"}
            onClick={() => toggleOrgPublish(!orgProfile.is_published)}
            disabled={saving}
          >
            {orgProfile.is_published ? "Снять с публикации" : "Опубликовать"}
          </button>
        )}
      </div>
    </div>
  );
}
