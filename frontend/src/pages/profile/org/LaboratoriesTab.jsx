import React, { useRef, useEffect, useState } from "react";

/**
 * Общий модуль «Лаборатории»: создание/редактирование лабораторий, привязка оборудования, задач, сотрудников.
 * Используется и представителем организации, и представителем лаборатории.
 */
export default function LaboratoriesTab({
  labDraft,
  handleLabDraft,
  orgEquipment,
  toggleLabEquipment,
  orgTasks,
  toggleLabTaskSolution,
  orgEmployees,
  toggleLabEmployee,
  setLabHead = () => {},
  handleLabFiles,
  removeDraftImage,
  splitMedia,
  fileNameFromUrl,
  createLab,
  orgLabs,
  editingLabId,
  labEdit,
  handleLabEditChange,
  handleLabEditFiles,
  removeEditImage,
  updateLab,
  cancelEditLab,
  startEditLab,
  deleteLab,
  openGallery,
  toggleLabPublish,
  uploading,
  saving,
  onFileInputRefsReady,
}) {
  const draftFilesInputRef = useRef(null);
  const editFilesInputRef = useRef(null);
  const newLabRef = useRef(null);
  const listRef = useRef(null);
  const [expandedNewLab, setExpandedNewLab] = useState(false);

  useEffect(() => {
    onFileInputRefsReady?.([draftFilesInputRef, editFilesInputRef]);
  }, [onFileInputRefsReady]);

  const handleAddLabClick = () => {
    setExpandedNewLab(true);
    requestAnimationFrame(() => {
      if (newLabRef.current) {
        newLabRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleCreateLab = async () => {
    const ok = await createLab();
    if (ok) {
      setExpandedNewLab(false);
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
        <p className="lab-tab-desc">Создавайте лаборатории, назначайте руководителей и участников, привязывайте оборудование и задачи.</p>
        <button
          type="button"
          className="primary-btn lab-btn-add"
          onClick={handleAddLabClick}
        >
          + Добавить лабораторию
        </button>
      </div>
      <div className="profile-list" ref={listRef}>
        {orgLabs.length === 0 && <p className="muted">Лаборатории пока не добавлены.</p>}
        {orgLabs.map((lab) => (
          <div key={lab.id} className="profile-list-card">
            <div className="profile-list-content">
              <div className="profile-list-title">
                {lab.name}
                <span
                  className={`org-detail-chip org-detail-chip--status ${lab.is_published ? "org-detail-chip--published" : "org-detail-chip--draft"}`}
                  title={lab.is_published ? "Лаборатория опубликована" : "Черновик — видно только вам"}
                >
                  {lab.is_published ? "Опубликовано" : "Черновик"}
                </span>
              </div>
              {lab.head_employee && (
                <div className="lab-head-badge">
                  Руководитель: {lab.head_employee.full_name}
                </div>
              )}
              {lab.activities && <div className="profile-list-text">{lab.activities}</div>}
              {lab.description && <div className="profile-list-text">{lab.description}</div>}
              {((lab.employees || []).length > 0 || (lab.researchers || []).length > 0) && (
                <div className="chip-row">
                  {(lab.employees || []).map((employee) => (
                    <span key={`emp-${employee.id}`} className="chip">
                      {employee.full_name}
                      {lab.head_employee_id === employee.id && " (рук.)"}
                    </span>
                  ))}
                  {(lab.researchers || []).map((researcher) => (
                    <span key={`res-${researcher.id}`} className="chip chip--researcher">
                      {researcher.full_name}
                      <span className="chip-hint"> (присоединился)</span>
                    </span>
                  ))}
                </div>
              )}
              {(lab.equipment || []).length > 0 && (
                <div className="chip-row">
                  {lab.equipment.map((item) => (
                    <span key={item.id} className="chip">
                      {item.name}
                    </span>
                  ))}
                </div>
              )}
              {(lab.task_solutions || []).length > 0 && (
                <div className="chip-row">
                  {lab.task_solutions.map((task) => (
                    <span key={task.id} className="chip">
                      {task.title}
                    </span>
                  ))}
                </div>
              )}
              {splitMedia(lab.image_urls).images.length > 0 && (
                <button
                  type="button"
                  className="gallery-preview"
                  onClick={() => openGallery(splitMedia(lab.image_urls).images, 0)}
                >
                  <img src={splitMedia(lab.image_urls).images[0]} alt={lab.name} />
                  {splitMedia(lab.image_urls).images.length > 1 && (
                    <span className="gallery-count">
                      +{splitMedia(lab.image_urls).images.length - 1}
                    </span>
                  )}
                </button>
              )}
              {splitMedia(lab.image_urls).docs.length > 0 && (
                <div className="file-list">
                  {splitMedia(lab.image_urls).docs.map((url, index) => (
                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                      {fileNameFromUrl(url)}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {editingLabId === lab.id && labEdit ? (
              <div className="profile-edit lab-form-grouped">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <label>
                    Название
                    <input
                      value={labEdit.name}
                      onChange={(e) => handleLabEditChange("name", e.target.value)}
                      placeholder="Название лаборатории"
                    />
                  </label>
                  <label>
                    Чем занимается
                    <textarea
                      rows={2}
                      value={labEdit.activities}
                      onChange={(e) => handleLabEditChange("activities", e.target.value)}
                      placeholder="Направления работы"
                    />
                  </label>
                  <label>
                    Описание
                    <textarea
                      rows={2}
                      value={labEdit.description}
                      onChange={(e) => handleLabEditChange("description", e.target.value)}
                      placeholder="Краткое описание"
                    />
                  </label>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Сотрудники и руководитель</div>
                  {orgEmployees.length === 0 && (
                    <p className="muted">Сотрудников пока нет — добавьте в разделе «Сотрудники».</p>
                  )}
                  {orgEmployees.length > 0 && (
                    <>
                      <div className="lab-head-select-wrap">
                        <label htmlFor={`lab-head-edit-${lab.id}`} className="lab-head-select-label">
                          Руководитель лаборатории
                        </label>
                        <select
                          id={`lab-head-edit-${lab.id}`}
                          className="lab-head-select"
                          value={labEdit.head_employee_id ?? ""}
                          onChange={(e) => setLabHead(e.target.value ? Number(e.target.value) : null, true)}
                        >
                          <option value="">Не назначен</option>
                          {orgEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </option>
                          ))}
                        </select>
                        <span className="lab-field-hint">Можно выбрать только одного руководителя</span>
                      </div>
                      <div className="lab-employees-list">
                        <span className="lab-employees-list-title">Участники лаборатории</span>
                        {orgEmployees.map((employee) => (
                          <label key={employee.id} className="lab-employee-chip">
                            <input
                              type="checkbox"
                              checked={(labEdit.employee_ids || []).includes(employee.id)}
                              onChange={() => toggleLabEmployee(employee.id, true)}
                            />
                            <span className="lab-employee-chip-name">
                              {employee.full_name}
                              {(labEdit.head_employee_id || null) === employee.id && (
                                <span className="lab-employee-chip-badge">рук.</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Оборудование</div>
                  {orgEquipment.length === 0 && (
                    <p className="muted">Оборудование пока не добавлено — создайте в разделе «Оборудование».</p>
                  )}
                  {orgEquipment.map((item) => (
                    <label key={item.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={(labEdit.equipment_ids || []).includes(item.id)}
                        onChange={() => toggleLabEquipment(item.id, true)}
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Решённые задачи</div>
                  {orgTasks.length === 0 && (
                    <p className="muted">Решённые задачи пока не добавлены — создайте их в разделе «Задачи».</p>
                  )}
                  {orgTasks.map((task) => (
                    <label key={task.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={(labEdit.task_solution_ids || []).includes(task.id)}
                        onChange={() => toggleLabTaskSolution(task.id, true)}
                      />
                      {task.title}
                    </label>
                  ))}
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
                      onChange={(e) => handleLabEditFiles(e.target.files)}
                      disabled={uploading || saving}
                    />
                  </label>
                {labEdit.image_urls?.length > 0 && (
                  <div className="image-preview-grid">
                    {splitMedia(labEdit.image_urls).images.map((url, index) => (
                      <div key={`${url}-${index}`} className="image-preview">
                        <img src={url} alt="Лаборатория" />
                        <button
                          type="button"
                          className="image-remove"
                          onClick={() => removeEditImage("lab", index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {splitMedia(labEdit.image_urls).docs.length > 0 && (
                  <div className="file-list">
                    {splitMedia(labEdit.image_urls).docs.map((url, index) => (
                      <div key={`${url}-${index}`} className="file-item">
                        <a href={url} target="_blank" rel="noreferrer" className="file-link">
                          {fileNameFromUrl(url)}
                        </a>
                        <button
                          type="button"
                          className="file-remove"
                          onClick={() => removeEditImage("lab", index)}
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
                    <button className="primary-btn lab-btn-save" onClick={updateLab} disabled={saving}>
                      {saving ? "Сохранение…" : "Сохранить"}
                    </button>
                    <button type="button" className="ghost-btn" onClick={cancelEditLab} disabled={saving}>
                      Отмена
                    </button>
                  </div>
                  <div className="lab-form-actions__secondary">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => toggleLabPublish(lab.id, !lab.is_published)}
                      disabled={saving}
                    >
                      {lab.is_published ? "Снять с публикации" : "Опубликовать"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lab-card-actions">
                <button className="primary-btn lab-btn-edit" onClick={() => startEditLab(lab)} disabled={saving}>
                  Редактировать
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => toggleLabPublish(lab.id, !lab.is_published)}
                  disabled={saving}
                >
                  {lab.is_published ? "Снять с публикации" : "Опубликовать"}
                </button>
                <button
                  type="button"
                  className="ghost-btn lab-btn-delete"
                  onClick={() => deleteLab(lab.id)}
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
        ref={newLabRef}
        className={`profile-form-collapsible ${expandedNewLab ? "expanded" : ""}`}
      >
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewLab((prev) => !prev)}
          aria-expanded={expandedNewLab}
        >
          Новая лаборатория
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>
              Название лаборатории
              <input
                value={labDraft.name}
                onChange={(e) => handleLabDraft("name", e.target.value)}
                placeholder="Лаборатория материаловедения"
              />
            </label>
            <label>
              Чем занимается
              <textarea
                rows={3}
                value={labDraft.activities}
                onChange={(e) => handleLabDraft("activities", e.target.value)}
                placeholder="Наноматериалы, биосенсоры, моделирование"
              />
            </label>
            <label>
              Описание
              <textarea
                rows={3}
                value={labDraft.description}
                onChange={(e) => handleLabDraft("description", e.target.value)}
                placeholder="Короткое описание направления и компетенций"
              />
            </label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Сотрудники и руководитель</div>
            {orgEmployees.length === 0 && (
              <p className="muted">Сотрудников пока нет — добавьте в разделе «Сотрудники».</p>
            )}
            {orgEmployees.length > 0 && (
              <>
                <div className="lab-head-select-wrap">
                  <label htmlFor="lab-head-draft" className="lab-head-select-label">
                    Руководитель лаборатории
                  </label>
                  <select
                    id="lab-head-draft"
                    className="lab-head-select"
                    value={labDraft.head_employee_id ?? ""}
                    onChange={(e) => setLabHead(e.target.value ? Number(e.target.value) : null, false)}
                  >
                    <option value="">Не назначен</option>
                    {orgEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                  <span className="lab-field-hint">Можно выбрать только одного руководителя</span>
                </div>
                <div className="lab-employees-list">
                  <span className="lab-employees-list-title">Участники лаборатории</span>
                  {orgEmployees.map((employee) => (
                    <label key={employee.id} className="lab-employee-chip">
                      <input
                        type="checkbox"
                        checked={(labDraft.employee_ids || []).includes(employee.id)}
                        onChange={() => toggleLabEmployee(employee.id, false)}
                      />
                      <span className="lab-employee-chip-name">
                        {employee.full_name}
                        {(labDraft.head_employee_id || null) === employee.id && (
                          <span className="lab-employee-chip-badge">рук.</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Оборудование</div>
            {orgEquipment.length === 0 && (
              <p className="muted">Оборудование пока не добавлено — создайте в разделе «Оборудование».</p>
            )}
            {orgEquipment.map((item) => (
              <label key={item.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={(labDraft.equipment_ids || []).includes(item.id)}
                  onChange={() => toggleLabEquipment(item.id, false)}
                />
                {item.name}
              </label>
            ))}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Решённые задачи</div>
            {orgTasks.length === 0 && (
              <p className="muted">Решённые задачи пока не добавлены — создайте их в разделе «Задачи».</p>
            )}
            {orgTasks.map((task) => (
              <label key={task.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={(labDraft.task_solution_ids || []).includes(task.id)}
                  onChange={() => toggleLabTaskSolution(task.id, false)}
                />
                {task.title}
              </label>
            ))}
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
                onChange={(e) => handleLabFiles(e.target.files)}
                disabled={uploading || saving}
              />
            </label>
            {labDraft.image_urls?.length > 0 && (
              <div className="image-preview-grid">
                {splitMedia(labDraft.image_urls).images.map((url, index) => (
                  <div key={`${url}-${index}`} className="image-preview">
                    <img src={url} alt="Предпросмотр лаборатории" />
                    <button
                      type="button"
                      className="image-remove"
                      onClick={() => removeDraftImage("lab", index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {splitMedia(labDraft.image_urls).docs.length > 0 && (
              <div className="file-list">
                {splitMedia(labDraft.image_urls).docs.map((url, index) => (
                  <div key={`${url}-${index}`} className="file-item">
                    <a href={url} target="_blank" rel="noreferrer" className="file-link">
                      {fileNameFromUrl(url)}
                    </a>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={() => removeDraftImage("lab", index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="preview-card">
        <div className="preview-title">Предпросмотр карточки лаборатории</div>
        <div className="org-item-title">{labDraft.name || "Название лаборатории"}</div>
        {labDraft.activities && <div className="org-item-text">{labDraft.activities}</div>}
        {labDraft.description && <div className="org-item-text">{labDraft.description}</div>}
        {(labDraft.employee_ids || []).length > 0 && (
          <div className="org-item-text">
            Сотрудники:{" "}
            {orgEmployees
              .filter((employee) => (labDraft.employee_ids || []).includes(employee.id))
              .map((employee) =>
                labDraft.head_employee_id === employee.id
                  ? `${employee.full_name} (рук.)`
                  : employee.full_name
              )
              .join(", ")}
          </div>
        )}
        {(labDraft.equipment_ids || []).length > 0 && (
          <div className="org-item-text">
            Оборудование:{" "}
            {orgEquipment
              .filter((item) => (labDraft.equipment_ids || []).includes(item.id))
              .map((item) => item.name)
              .join(", ")}
          </div>
        )}
        {splitMedia(labDraft.image_urls).images.length > 0 && (
          <button
            type="button"
            className="gallery-preview"
            onClick={() => openGallery(splitMedia(labDraft.image_urls).images, 0)}
          >
            <img src={splitMedia(labDraft.image_urls).images[0]} alt="Фото" />
            {splitMedia(labDraft.image_urls).images.length > 1 && (
              <span className="gallery-count">
                +{splitMedia(labDraft.image_urls).images.length - 1}
              </span>
            )}
          </button>
        )}
        {splitMedia(labDraft.image_urls).docs.length > 0 && (
          <div className="file-list">
            {splitMedia(labDraft.image_urls).docs.map((url, index) => (
              <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                {fileNameFromUrl(url)}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="lab-form-actions lab-form-actions--create">
        <button className="primary-btn lab-btn-save" onClick={handleCreateLab} disabled={saving}>
          {saving ? "Сохранение…" : "Создать лабораторию"}
        </button>
      </div>
        </div>
      </div>
    </div>
  );
}
