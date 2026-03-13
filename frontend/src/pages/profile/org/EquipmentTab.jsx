import React, { useRef, useEffect, useState } from "react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

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
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>Оборудование</h2>
        <Button variant="primary" onClick={handleAddEquipmentClick}>
          + Добавить оборудование
        </Button>
      </div>
      <p className="profile-section-desc" style={{ marginBottom: "1.5rem" }}>
        Добавляйте единицы оборудования, указывайте характеристики и привязывайте к лабораториям.
      </p>
      <div className="profile-list" ref={listRef}>
        {orgEquipment.length === 0 && (
          <div className="profile-empty-state">
            Оборудование пока не добавлено.
          </div>
        )}
        {orgEquipment.map((item) => (
          <Card key={item.id} variant="elevated" padding="md" className="dashboard-list-item">
            <div className="dashboard-list-item__title-row">
              <h4 className="dashboard-list-item__title">{item.name}</h4>
            </div>
            {(item.laboratories || []).length > 0 && (
              <div className="profile-list-text muted">
                Лаборатории: {(item.laboratories || []).map((l) => l.name).join(", ")}
              </div>
            )}
            {item.characteristics && <p className="profile-list-text" style={{ margin: 0 }}>{item.characteristics}</p>}
            {item.description && <p className="profile-list-text" style={{ margin: 0 }}>{item.description}</p>}
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
            {editingEquipmentId === item.id && equipmentEdit ? (
              <div className="profile-edit lab-form-grouped profile-form">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <Input
                    id={`equipment-edit-name-${item.id}`}
                    label="Название"
                    value={equipmentEdit.name}
                    onChange={(e) => handleEquipmentEditChange("name", e.target.value)}
                    placeholder="Название оборудования"
                  />
                  <div className="ui-input-group">
                    <label htmlFor={`equipment-edit-characteristics-${item.id}`}>Характеристики</label>
                    <textarea
                      id={`equipment-edit-characteristics-${item.id}`}
                      rows={2}
                      className="ui-input"
                      value={equipmentEdit.characteristics}
                      onChange={(e) => handleEquipmentEditChange("characteristics", e.target.value)}
                      placeholder="Параметры, точность"
                    />
                  </div>
                  <div className="ui-input-group">
                    <label htmlFor={`equipment-edit-description-${item.id}`}>Описание</label>
                    <textarea
                      id={`equipment-edit-description-${item.id}`}
                      rows={2}
                      className="ui-input"
                      value={equipmentEdit.description}
                      onChange={(e) => handleEquipmentEditChange("description", e.target.value)}
                      placeholder="Краткое описание"
                    />
                  </div>
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
                  <div className="ui-input-group">
                    <label htmlFor={`equipment-edit-files-${item.id}`}>Добавить файлы</label>
                    <input
                      ref={editFilesInputRef}
                      id={`equipment-edit-files-${item.id}`}
                      type="file"
                      className="ui-input"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      multiple
                      onChange={(e) => handleEquipmentEditFiles(e.target.files)}
                      disabled={uploading || saving}
                    />
                  </div>
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
                  <Button variant="primary" onClick={updateEquipment} loading={saving} disabled={saving}>
                    {saving ? "Сохранение…" : "Сохранить"}
                  </Button>
                  <Button variant="ghost" onClick={cancelEditEquipment} disabled={saving}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="dashboard-list-item__actions">
                <Button variant="primary" size="small" onClick={() => startEditEquipment(item)} disabled={saving}>
                  Редактировать
                </Button>
                <Button variant="ghost" size="small" className="lab-btn-delete" onClick={() => deleteEquipment(item.id)} disabled={saving}>
                  Удалить
                </Button>
              </div>
            )}
          </Card>
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
        <div className="profile-form-collapsible-body lab-form-grouped profile-form">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <Input
              id="equipment-draft-name"
              label="Название оборудования"
              value={equipmentDraft.name}
              onChange={(e) => handleEquipmentDraft("name", e.target.value)}
              placeholder="Микроскоп, хроматограф..."
            />
            <div className="ui-input-group">
              <label htmlFor="equipment-draft-characteristics">Характеристики</label>
              <textarea
                id="equipment-draft-characteristics"
                rows={2}
                className="ui-input"
                value={equipmentDraft.characteristics}
                onChange={(e) => handleEquipmentDraft("characteristics", e.target.value)}
                placeholder="Параметры, точность"
              />
            </div>
            <div className="ui-input-group">
              <label htmlFor="equipment-draft-description">Описание</label>
              <textarea
                id="equipment-draft-description"
                rows={2}
                className="ui-input"
                value={equipmentDraft.description}
                onChange={(e) => handleEquipmentDraft("description", e.target.value)}
                placeholder="Краткое описание"
              />
            </div>
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
            <div className="ui-input-group">
              <label htmlFor="equipment-draft-files">Файлы (изображения и документы)</label>
              <input
                ref={draftFilesInputRef}
                id="equipment-draft-files"
                type="file"
                className="ui-input"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                multiple
                onChange={(e) => handleEquipmentFiles(e.target.files)}
                disabled={uploading || saving}
              />
            </div>
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
            <Button variant="primary" onClick={handleCreateEquipment} loading={saving} disabled={saving}>
              {saving ? "Сохранение…" : "Создать оборудование"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
