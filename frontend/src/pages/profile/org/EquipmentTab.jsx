import React, { useRef, useEffect, useState } from "react";

/**
 * Общий модуль «Оборудование»: создание/редактирование оборудования, привязка к лабораториям.
 * Используется и представителем организации, и представителем лаборатории.
 */
export default function EquipmentTab({
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
  const newEquipmentRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    onFileInputRefsReady?.([draftFilesInputRef, editFilesInputRef]);
  }, [onFileInputRefsReady]);

  const [expandedNewEquipment, setExpandedNewEquipment] = useState(false);

  const toggleEditLab = (labId, isEdit) => {
    if (!isEdit || !equipmentEdit) return;
    const included = (equipmentEdit.laboratory_ids || []).includes(labId);
    handleEquipmentEditChange(
      "laboratory_ids",
      included
        ? (equipmentEdit.laboratory_ids || []).filter((id) => id !== labId)
        : [...(equipmentEdit.laboratory_ids || []), labId]
    );
  };

  const handleAddEquipmentClick = () => {
    setExpandedNewEquipment(true);
    requestAnimationFrame(() => {
      if (newEquipmentRef.current) {
        newEquipmentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleCreateEquipment = async () => {
    const ok = await createEquipment();
    if (ok) {
      setExpandedNewEquipment(false);
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  };

  return (
    <div className="profile-form">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Добавляйте единицы оборудования, указывайте характеристики и привязывайте к лабораториям.</p>
        <button
          type="button"
          className="primary-btn lab-btn-add"
          onClick={handleAddEquipmentClick}
        >
          + Добавить оборудование
        </button>
      </div>
      <div className="profile-list" ref={listRef}>
        {orgEquipment.length === 0 && <p className="muted">Оборудование пока не добавлено.</p>}
        {orgEquipment.map((item) => (
          <div key={item.id} className="profile-list-card">
            <div className="profile-list-content">
              <div className="profile-list-title">{item.name}</div>
              {item.characteristics && <div className="profile-list-text">{item.characteristics}</div>}
              {item.description && <div className="profile-list-text">{item.description}</div>}
              {(item.laboratories || []).length > 0 && (
                <div className="chip-row">
                  {(item.laboratories || []).map((lab) => (
                    <span key={lab.id} className="chip">{lab.name}</span>
                  ))}
                </div>
              )}
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
              <div className="profile-edit lab-form-grouped">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <label>
                    Название
                    <input
                      value={equipmentEdit.name}
                      onChange={(e) => handleEquipmentEditChange("name", e.target.value)}
                      placeholder="Название оборудования"
                    />
                  </label>
                  <label>
                    Характеристики
                    <textarea
                      rows={2}
                      value={equipmentEdit.characteristics}
                      onChange={(e) => handleEquipmentEditChange("characteristics", e.target.value)}
                      placeholder="Параметры, точность"
                    />
                  </label>
                  <label>
                    Описание
                    <textarea
                      rows={2}
                      value={equipmentEdit.description}
                      onChange={(e) => handleEquipmentEditChange("description", e.target.value)}
                      placeholder="Краткое описание"
                    />
                  </label>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Лаборатории</div>
                  {orgLabs.length === 0 && (
                    <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>
                  )}
                  {orgLabs.length > 0 && (
                    <div className="lab-employees-list equipment-labs-list">
                      <span className="lab-employees-list-title">Где установлено</span>
                      {orgLabs.map((lab) => (
                        <label key={lab.id} className="lab-employee-chip">
                          <input
                            type="checkbox"
                            checked={(equipmentEdit.laboratory_ids || []).includes(lab.id)}
                            onChange={() => toggleEditLab(lab.id, true)}
                          />
                          <span className="lab-employee-chip-name">{lab.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Медиафайлы</div>
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
                </div>
                <div className="lab-form-actions">
                  <div className="lab-form-actions__primary">
                    <button className="primary-btn lab-btn-save" onClick={updateEquipment} disabled={saving}>
                      {saving ? "Сохранение…" : "Сохранить"}
                    </button>
                    <button type="button" className="ghost-btn" onClick={cancelEditEquipment} disabled={saving}>
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lab-card-actions">
                <button className="primary-btn lab-btn-edit" onClick={() => startEditEquipment(item)} disabled={saving}>
                  Редактировать
                </button>
                <button
                  type="button"
                  className="ghost-btn lab-btn-delete"
                  onClick={() => deleteEquipment(item.id)}
                  disabled={saving}
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        ref={newEquipmentRef}
        className={`profile-form-collapsible ${expandedNewEquipment ? "expanded" : ""}`}
      >
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewEquipment((prev) => !prev)}
          aria-expanded={expandedNewEquipment}
        >
          Новое оборудование
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>
              Название оборудования
              <input
                value={equipmentDraft.name}
                onChange={(e) => handleEquipmentDraft("name", e.target.value)}
                placeholder="Микроскоп, хроматограф..."
              />
            </label>
            <label>
              Характеристики
              <textarea
                rows={2}
                value={equipmentDraft.characteristics}
                onChange={(e) => handleEquipmentDraft("characteristics", e.target.value)}
                placeholder="Параметры, точность"
              />
            </label>
            <label>
              Описание
              <textarea
                rows={2}
                value={equipmentDraft.description}
                onChange={(e) => handleEquipmentDraft("description", e.target.value)}
                placeholder="Краткое описание"
              />
            </label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Лаборатории</div>
            {orgLabs.length === 0 && (
              <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>
            )}
            {orgLabs.length > 0 && (
              <div className="lab-employees-list equipment-labs-list">
                <span className="lab-employees-list-title">Где установлено</span>
                {orgLabs.map((lab) => (
                  <label key={lab.id} className="lab-employee-chip">
                    <input
                      type="checkbox"
                      checked={(equipmentDraft.laboratory_ids || []).includes(lab.id)}
                      onChange={() => toggleEquipmentLab(lab.id, false)}
                    />
                    <span className="lab-employee-chip-name">{lab.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Медиафайлы</div>
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
                    <img src={url} alt="Предпросмотр" />
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
          </div>
          <div className="preview-card">
            <div className="preview-title">Предпросмотр карточки</div>
            <div className="org-item-title">{equipmentDraft.name || "Название оборудования"}</div>
            {equipmentDraft.characteristics && (
              <div className="org-item-text">{equipmentDraft.characteristics}</div>
            )}
            {equipmentDraft.description && <div className="org-item-text">{equipmentDraft.description}</div>}
            {(equipmentDraft.laboratory_ids || []).length > 0 && (
              <div className="chip-row">
                {orgLabs
                  .filter((l) => (equipmentDraft.laboratory_ids || []).includes(l.id))
                  .map((l) => (
                    <span key={l.id} className="chip">{l.name}</span>
                  ))}
              </div>
            )}
            {splitMedia(equipmentDraft.image_urls).images.length > 0 && (
              <button
                type="button"
                className="gallery-preview"
                onClick={() => openGallery(splitMedia(equipmentDraft.image_urls).images, 0)}
              >
                <img src={splitMedia(equipmentDraft.image_urls).images[0]} alt="Фото" />
                {splitMedia(equipmentDraft.image_urls).images.length > 1 && (
                  <span className="gallery-count">+{splitMedia(equipmentDraft.image_urls).images.length - 1}</span>
                )}
              </button>
            )}
          </div>
          <div className="lab-form-actions lab-form-actions--create">
            <button className="primary-btn lab-btn-save" onClick={handleCreateEquipment} disabled={saving}>
              {saving ? "Сохранение…" : "Создать оборудование"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
