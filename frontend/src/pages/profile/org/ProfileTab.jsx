import React, { useRef, useEffect } from "react";
import { normalizeWebsiteInput } from "../../../utils/validation";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
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
        <Input
          id="org-name"
          label="Название организации"
          value={orgProfile?.name || ""}
          onChange={(e) => handleOrgChange("name", e.target.value)}
          placeholder="Название"
        />
        <div className="ui-input-group">
          <label htmlFor="org-description">Описание</label>
          <textarea
            id="org-description"
            rows={4}
            className="ui-input"
            value={orgProfile?.description || ""}
            onChange={(e) => handleOrgChange("description", e.target.value)}
            placeholder="Краткое описание организации"
          />
        </div>
        <div className="ui-input-group">
          <label htmlFor="org-avatar">Аватар организации</label>
          <input
            ref={avatarInputRef}
            id="org-avatar"
            type="file"
            className="ui-input"
            accept="image/*"
            onChange={(e) => uploadOrgAvatar(e.target.files?.[0])}
            disabled={uploading || saving}
          />
        </div>
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
        <div className="profile-form__row">
          <Input
            id="org-address"
            label="Адрес"
            value={orgProfile?.address || ""}
            onChange={(e) => handleOrgChange("address", e.target.value)}
            placeholder="Адрес"
          />
          <Input
            id="org-website"
            label="Сайт"
            type="url"
            value={orgProfile?.website || ""}
            onChange={(e) => handleOrgChange("website", e.target.value)}
            onBlur={(e) => {
              const v = (e.target.value || "").trim();
              if (v) handleOrgChange("website", normalizeWebsiteInput(v));
            }}
            placeholder="example.com или https://..."
          />
        </div>
      </div>

      <div className="profile-form-group">
        <div className="profile-form-group-title">OpenAlex / ROR</div>
        <OrgOpenAlexSection orgProfile={orgProfile} onOrgRorLinked={onOrgRorLinked} compact hideLabel />
      </div>

      <div className="profile-actions-wrap">
        <Button variant="primary" onClick={saveOrganization} loading={saving} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </Button>
        {orgProfile && orgProfile.name && (
          <Button
            variant={orgProfile.is_published ? "secondary" : "ghost"}
            onClick={() => toggleOrgPublish(!orgProfile.is_published)}
            disabled={saving}
          >
            {orgProfile.is_published ? "Снять с публикации" : "Опубликовать"}
          </Button>
        )}
      </div>
    </div>
  );
}
