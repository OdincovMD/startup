import React, { useRef, useEffect } from "react";
import { normalizeWebsiteInput } from "../../../utils/validation";
import OrgOpenAlexSection from "../OrgOpenAlexSection";

/**
 * Модуль «Профиль организации»: название, аватар, адрес, сайт, описание, сохранение и публикация.
 */
export default function ProfileTab({
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
    <div className="profile-form profile-form--grouped org-profile-tab">
      <div className="profile-form-group">
        <div className="profile-form-group-title">
          Основные данные
          {orgProfile && orgProfile.name && (
            <span
              className={`org-detail-chip org-detail-chip--status ${orgProfile.is_published ? "org-detail-chip--published" : "org-detail-chip--draft"}`}
              style={{ marginLeft: "0.5rem" }}
            >
              {orgProfile.is_published ? "Опубликована" : "Черновик"}
            </span>
          )}
        </div>
        <label>
          Название организации
          <input
            value={orgProfile?.name || ""}
            onChange={(e) => handleOrgChange("name", e.target.value)}
            placeholder="Название"
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
      </div>

      <div className="profile-form-group">
        <div className="profile-form-group-title">Контакты и адрес</div>
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
      </div>

      <div className="profile-form-group org-profile-ror-wrap">
        <OrgOpenAlexSection orgProfile={orgProfile} onOrgRorLinked={onOrgRorLinked} compact />
      </div>

      <div className="profile-actions-wrap">
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
