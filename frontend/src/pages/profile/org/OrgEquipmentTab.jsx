import React, { useRef, useEffect, useState } from "react";

/**
 * Общий модуль «Оборудование»: создание/редактирование оборудования, привязка к лабораториям.
 * Используется и представителем организации, и представителем лаборатории.
 */
export default function OrgEquipmentTab({
  equipmentDraft,
  handleEquipmentDraft,
  orgLabs,
  toggleEquipmentLab,
  handleEquipmentFiles,
  removeDraftImage,
  splitMedia,
  fileNameFromUrl,
  createEquipment,
  orgEquipment,
  editingEquipmentId,
  equipmentEdit,
  handleEquipmentEditChange,
  handleEquipmentEditFiles,
  removeEditImage,
  updateEquipment,
  cancelEditEquipment,
  startEditEquipment,
  deleteEquipment,
  openGallery,
  uploading,
  saving,
  onFileInputRefsReady,
}) {
  const draftFilesInputRef = useRef(null);
  const editFilesInputRef = useRef(null);

  useEffect(() => {
    onFileInputRefsReady?.([draftFilesInputRef, editFilesInputRef]);
  }, [onFileInputRefsReady]);

  const [expandedEquipment, setExpandedEquipment] = useState(true);
  const [expandedNewEquipment, setExpandedNewEquipment] = useState(false);

  return (
    <div className="profile-form">
      <div className={`profile-card-collapsible ${expandedEquipment ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-card-header"
          onClick={() => setExpandedEquipment((prev) => !prev)}
          aria-expanded={expandedEquipment}
        >
          Оборудование ({orgEquipment.length})
        </button>
        <div className="profile-card-body">
          <div className="profile-list">
        {orgEquipment.length === 0 && <p className="muted">Оборудование пока не добавлено.</p>}
        {orgEquipment.map((item) => (
          <div key={item.id} className="profile-list-card">
            <div className="profile-list-content">
              <div className="profile-list-title">{item.name}</div>
              {item.characteristics && <div className="profile-list-text">{item.characteristics}</div>}
              {item.description && <div className="profile-list-text">{item.description}</div>}
              {splitMedia(item.image_urls).images.length > 0 && (
                <button
                  type="button"
                  className="gallery-preview"
                  onClick={() => openGallery(splitMedia(item.image_urls).images, 0)}
                >
                  <img src={splitMedia(item.image_urls).images[0]} alt={item.name} />
                  {splitMedia(item.image_urls).images.length > 1 && (
                    <span className="gallery-count">
                      +{splitMedia(item.image_urls).images.length - 1}
                    </span>
                  )}
                </button>
              )}
              {splitMedia(item.image_urls).docs.length > 0 && (
                <div className="file-list">
                  {splitMedia(item.image_urls).docs.map((url, index) => (
                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                      {fileNameFromUrl(url)}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {editingEquipmentId === item.id && equipmentEdit ? (
              <div className="profile-edit">
                <label>
                  Название
                  <input
                    value={equipmentEdit.name}
                    onChange={(e) => handleEquipmentEditChange("name", e.target.value)}
                  />
                </label>
                <label>
                  Характеристики
                  <textarea
                    rows={2}
                    value={equipmentEdit.characteristics}
                    onChange={(e) => handleEquipmentEditChange("characteristics", e.target.value)}
                  />
                </label>
                <label>
                  Описание
                  <textarea
                    rows={2}
                    value={equipmentEdit.description}
                    onChange={(e) => handleEquipmentEditChange("description", e.target.value)}
                  />
                </label>
                <div className="profile-form">
                  <div className="profile-label">Лаборатории</div>
                  {orgLabs.length === 0 && (
                    <p className="muted">Лабораторий пока нет — создайте первую.</p>
                  )}
                  {orgLabs.map((lab) => (
                    <label key={lab.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={(equipmentEdit.laboratory_ids || []).includes(lab.id)}
                        onChange={() =>
                          handleEquipmentEditChange(
                            "laboratory_ids",
                            (equipmentEdit.laboratory_ids || []).includes(lab.id)
                              ? (equipmentEdit.laboratory_ids || []).filter((id) => id !== lab.id)
                              : [...(equipmentEdit.laboratory_ids || []), lab.id]
                          )
                        }
                      />
                      {lab.name}
                    </label>
                  ))}
                </div>
                <label>
                  Добавить файлы
                  <input
                    ref={editFilesInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    multiple
                    onChange={(e) => handleEquipmentEditFiles(e.target.files)}
                    disabled={uploading || saving}
                  />
                </label>
                {equipmentEdit.image_urls?.length > 0 && (
                  <div className="image-preview-grid">
                    {splitMedia(equipmentEdit.image_urls).images.map((url, index) => (
                      <div key={`${url}-${index}`} className="image-preview">
                        <img src={url} alt="Оборудование" />
                        <button
                          type="button"
                          className="image-remove"
                          onClick={() => removeEditImage("equipment", index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {splitMedia(equipmentEdit.image_urls).docs.length > 0 && (
                  <div className="file-list">
                    {splitMedia(equipmentEdit.image_urls).docs.map((url, index) => (
                      <div key={`${url}-${index}`} className="file-item">
                        <a href={url} target="_blank" rel="noreferrer" className="file-link">
                          {fileNameFromUrl(url)}
                        </a>
                        <button
                          type="button"
                          className="file-remove"
                          onClick={() => removeEditImage("equipment", index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="profile-actions">
                  <button className="primary-btn" onClick={updateEquipment} disabled={saving}>
                    Сохранить
                  </button>
                  <button className="ghost-btn" onClick={cancelEditEquipment} disabled={saving}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-actions">
                <button className="ghost-btn" onClick={() => startEditEquipment(item)} disabled={saving}>
                  Редактировать
                </button>
                <button className="ghost-btn" onClick={() => deleteEquipment(item.id)} disabled={saving}>
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
          </div>
        </div>
      </div>

      <div className={`profile-form-collapsible ${expandedNewEquipment ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewEquipment((prev) => !prev)}
          aria-expanded={expandedNewEquipment}
        >
          Новое оборудование
        </button>
        <div className="profile-form-collapsible-body">
      <label>
        Название оборудования
        <input
          value={equipmentDraft.name}
          onChange={(e) => handleEquipmentDraft("name", e.target.value)}
          placeholder="Микроскоп"
        />
      </label>
      <label>
        Характеристики
        <textarea
          rows={2}
          value={equipmentDraft.characteristics}
          onChange={(e) => handleEquipmentDraft("characteristics", e.target.value)}
          placeholder="Параметры, точность и т.д."
        />
      </label>
      <label>
        Описание
        <textarea
          rows={2}
          value={equipmentDraft.description}
          onChange={(e) => handleEquipmentDraft("description", e.target.value)}
          placeholder="Описание оборудования"
        />
      </label>
      <div className="profile-form">
        <div className="profile-label">Лаборатории, где установлено оборудование</div>
        {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте первую.</p>}
        {orgLabs.map((lab) => (
          <label key={lab.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={(equipmentDraft.laboratory_ids || []).includes(lab.id)}
              onChange={() => toggleEquipmentLab(lab.id, false)}
            />
            {lab.name}
          </label>
        ))}
      </div>
      <label>
        Файлы (изображения и документы)
        <input
          ref={draftFilesInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          multiple
          onChange={(e) => handleEquipmentFiles(e.target.files)}
          disabled={uploading || saving}
        />
      </label>
      {equipmentDraft.image_urls?.length > 0 && (
        <div className="image-preview-grid">
          {splitMedia(equipmentDraft.image_urls).images.map((url, index) => (
            <div key={`${url}-${index}`} className="image-preview">
              <img src={url} alt="Предпросмотр оборудования" />
              <button
                type="button"
                className="image-remove"
                onClick={() => removeDraftImage("equipment", index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {splitMedia(equipmentDraft.image_urls).docs.length > 0 && (
        <div className="file-list">
          {splitMedia(equipmentDraft.image_urls).docs.map((url, index) => (
            <div key={`${url}-${index}`} className="file-item">
              <a href={url} target="_blank" rel="noreferrer" className="file-link">
                {fileNameFromUrl(url)}
              </a>
              <button
                type="button"
                className="file-remove"
                onClick={() => removeDraftImage("equipment", index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="preview-card">
        <div className="preview-title">Предпросмотр карточки оборудования</div>
        <div className="org-item-title">{equipmentDraft.name || "Название оборудования"}</div>
        {equipmentDraft.characteristics && (
          <div className="org-item-text">{equipmentDraft.characteristics}</div>
        )}
        {equipmentDraft.description && <div className="org-item-text">{equipmentDraft.description}</div>}
        {splitMedia(equipmentDraft.image_urls).images.length > 0 && (
          <button
            type="button"
            className="gallery-preview"
            onClick={() => openGallery(splitMedia(equipmentDraft.image_urls).images, 0)}
          >
            <img src={splitMedia(equipmentDraft.image_urls).images[0]} alt="Фото" />
            {splitMedia(equipmentDraft.image_urls).images.length > 1 && (
              <span className="gallery-count">
                +{splitMedia(equipmentDraft.image_urls).images.length - 1}
              </span>
            )}
          </button>
        )}
        {splitMedia(equipmentDraft.image_urls).docs.length > 0 && (
          <div className="file-list">
            {splitMedia(equipmentDraft.image_urls).docs.map((url, index) => (
              <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                {fileNameFromUrl(url)}
              </a>
            ))}
          </div>
        )}
      </div>
      <button className="primary-btn" onClick={createEquipment} disabled={saving}>
        {saving ? "Сохраняем..." : "Добавить оборудование"}
      </button>
        </div>
      </div>
    </div>
  );
}
