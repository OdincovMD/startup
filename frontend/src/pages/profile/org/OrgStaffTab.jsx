import React, { useRef, useEffect, useState } from "react";
import { formatPhoneRU, normalizeWebsiteInput } from "../../../utils/validation";

/**
 * Общий модуль «Сотрудники»: форма нового сотрудника, редактирование, список.
 * Используется и представителем организации, и представителем лаборатории.
 */
export default function OrgStaffTab({
  employeeDraft,
  handleEmployeeDraftChange,
  setEmployeeDraft,
  uploadEmployeePhoto,
  employeeDraftPositionInput,
  setEmployeeDraftPositionInput,
  employeeDraftInterestsInput,
  setEmployeeDraftInterestsInput,
  researchInterestOptions,
  addInterestPreset,
  orgLabs,
  toggleEmployeeLab,
  newLabDraft,
  setNewLabDraft,
  createLabFromStaff,
  addEducation,
  removeEducation,
  showDraftPublications,
  setShowDraftPublications,
  updatePublication,
  removePublication,
  addPublication,
  handleEmployeeContacts,
  createEmployee,
  employeeEditId,
  employeeEdit,
  handleEmployeeEditChange,
  employeeEditPositionInput,
  setEmployeeEditPositionInput,
  employeeEditInterestsInput,
  setEmployeeEditInterestsInput,
  showEditPublications,
  setShowEditPublications,
  updateEmployee,
  cancelEditEmployee,
  startEditEmployee,
  deleteEmployee,
  orgEmployees,
  setEmployeePreview,
  setShowEmployeePublications,
  importEmployeeOpenAlex,
  importEmployeeOpenAlexPreview,
  employeeDraftImporting,
  uploading,
  saving,
  onFileInputRefsReady,
}) {
  const draftEducationInputRef = useRef(null);
  const editEducationInputRef = useRef(null);
  const draftPhotoInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);

  useEffect(() => {
    onFileInputRefsReady?.([draftPhotoInputRef, editPhotoInputRef]);
  }, [onFileInputRefsReady]);

  const [expandedEmployees, setExpandedEmployees] = useState(true);
  const [employeeImportInput, setEmployeeImportInput] = useState("");
  const [employeeImporting, setEmployeeImporting] = useState(false);
  const [employeeDraftImportInput, setEmployeeDraftImportInput] = useState("");
  const [expandedDraftEducation, setExpandedDraftEducation] = useState(false);
  const [expandedDraftPublications, setExpandedDraftPublications] = useState(false);
  const [expandedNewEmployee, setExpandedNewEmployee] = useState(false);
  const [expandedEditEducation, setExpandedEditEducation] = useState(false);
  const [expandedEditPublications, setExpandedEditPublications] = useState(false);

  const handleEmployeeImport = async () => {
    if (!employeeEditId || !employeeImportInput?.trim() || !importEmployeeOpenAlex) return;
    const v = employeeImportInput.trim();
    const isOrcid = v.includes("orcid.org") || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v);
    const orcid = isOrcid ? v : undefined;
    const openalexId = !isOrcid ? v : undefined;
    setEmployeeImporting(true);
    try {
      await importEmployeeOpenAlex(employeeEditId, orcid, openalexId);
      setEmployeeImportInput("");
    } finally {
      setEmployeeImporting(false);
    }
  };

  const handleDraftImport = async () => {
    if (!employeeDraftImportInput?.trim() || !importEmployeeOpenAlexPreview) return;
    const v = employeeDraftImportInput.trim();
    const isOrcid = v.includes("orcid.org") || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v);
    const orcid = isOrcid ? v : undefined;
    const openalexId = !isOrcid ? v : undefined;
    try {
      await importEmployeeOpenAlexPreview(orcid, openalexId);
      setEmployeeDraftImportInput("");
    } catch (_) {}
  };

  return (
    <div className="profile-form">
      <div className={`profile-card-collapsible ${expandedEmployees ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-card-header"
          onClick={() => setExpandedEmployees((prev) => !prev)}
          aria-expanded={expandedEmployees}
        >
          Сотрудники ({orgEmployees.length})
        </button>
        <div className="profile-card-body">
          <div className="profile-list">
            {orgEmployees.length === 0 && <p className="muted">Сотрудники пока не добавлены.</p>}
            {orgEmployees.map((employee) => (
              <div key={employee.id} className="profile-list-card">
                <div className="profile-list-content">
                  {employee.photo_url && (
                    <div className="employee-photo employee-photo-small">
                      <img src={employee.photo_url} alt={employee.full_name} />
                    </div>
                  )}
                  <div className="profile-list-main">
                    <div className="profile-list-title">{employee.full_name}</div>
                    {employee.academic_degree && (
                      <div className="profile-list-text">{employee.academic_degree}</div>
                    )}
                    {(employee.positions || []).length > 0 && (
                      <div className="profile-list-text">{employee.positions.join(", ")}</div>
                    )}
                    {(() => {
                      const interests = Array.isArray(employee.research_interests)
                        ? employee.research_interests
                        : (employee.research_interests || "")
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                      return interests.length > 0 ? (
                        <div className="chip-row">
                          {interests.slice(0, 5).map((interest) => (
                            <span key={interest} className="chip">
                              {interest}
                            </span>
                          ))}
                          {interests.length > 5 && (
                            <span className="chip muted">+{interests.length - 5}</span>
                          )}
                        </div>
                      ) : null;
                    })()}
                    {(employee.education || []).length > 0 && (
                      <div className="profile-list-text small muted">
                        Образование: {(employee.education || []).slice(0, 2).join("; ")}
                        {(employee.education || []).length > 2 && " …"}
                      </div>
                    )}
                    {(employee.laboratories || []).length > 0 && (
                      <div className="chip-row">
                        {employee.laboratories.map((lab) => (
                          <span key={lab.id} className="chip">
                            {lab.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {(employee.hindex_wos != null || employee.hindex_scopus != null || employee.hindex_rsci != null || employee.hindex_openalex != null) && (
                      <div className="profile-list-text small muted">
                        h-index: WoS {employee.hindex_wos ?? "—"} / Scopus {employee.hindex_scopus ?? "—"} / РИНЦ {employee.hindex_rsci ?? "—"} / OpenAlex {employee.hindex_openalex ?? "—"}
                      </div>
                    )}
                    {employee.contacts && (employee.contacts.email || employee.contacts.phone) && (
                      <div className="profile-list-text small muted">
                        {employee.contacts.email || ""}
                        {(employee.contacts.email && employee.contacts.phone) ? " • " : ""}
                        {employee.contacts.phone || ""}
                      </div>
                    )}
                  </div>
                </div>
                <div className="profile-actions">
                  <button
                    className="ghost-btn"
                    onClick={() => {
                      setEmployeePreview(employee);
                      setShowEmployeePublications(false);
                    }}
                    disabled={saving}
                  >
                    Профиль
                  </button>
                  <button className="ghost-btn" onClick={() => startEditEmployee(employee)} disabled={saving}>
                    Редактировать
                  </button>
                  <button className="ghost-btn" onClick={() => deleteEmployee(employee.id)} disabled={saving}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {employeeEditId && employeeEdit && (
        <div className="profile-block" style={{ marginTop: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-secondary, #f5f5f5)", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.25)" }}>
          <h4>Редактирование: {employeeEdit.full_name || "Сотрудник"}</h4>
          <div className="profile-form" style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(255,255,255,0.6)", borderRadius: "6px" }}>
            <div className="profile-label">Импорт из OpenAlex</div>
            <p className="profile-field-hint" style={{ marginBottom: "0.5rem" }}>
              Введите ORCID или OpenAlex ID для подтягивания ФИО, интересов, образования, публикаций и h-индекса
            </p>
            <div className="inline-form" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <input
                type="text"
                value={employeeImportInput}
                onChange={(e) => setEmployeeImportInput(e.target.value)}
                placeholder="ORCID (0000-0001-6187-6610) или OpenAlex ID (A5023888391)"
                className="profile-input"
                style={{ flex: "1", minWidth: "200px" }}
              />
              <button
                type="button"
                className="profile-btn-integration profile-btn-integration--openalex"
                onClick={handleEmployeeImport}
                disabled={saving || employeeImporting || !employeeImportInput?.trim()}
              >
                {employeeImporting ? "Импорт..." : "Импортировать"}
              </button>
            </div>
          </div>
          <label>
            ФИО
            <input
              value={employeeEdit.full_name}
              onChange={(e) => handleEmployeeEditChange("full_name", e.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          </label>
          <label>
            Фото
            <input
              ref={editPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => uploadEmployeePhoto(e.target.files?.[0], true)}
              disabled={uploading || saving}
            />
          </label>
          {employeeEdit.photo_url && (
            <div className="employee-photo">
              <img src={employeeEdit.photo_url} alt="Фото" />
              <button className="file-remove" onClick={() => handleEmployeeEditChange("photo_url", "")}>
                ×
              </button>
            </div>
          )}
          <label>
            Учёная степень / звание
            <input
              value={employeeEdit.academic_degree}
              onChange={(e) => handleEmployeeEditChange("academic_degree", e.target.value)}
              placeholder="Доктор химических наук"
            />
          </label>
          <label>
            Должности (через запятую)
            <input
              value={employeeEditPositionInput}
              onChange={(e) => setEmployeeEditPositionInput(e.target.value)}
              placeholder="Постдок, научный сотрудник"
            />
            <span className="profile-field-hint">Перечислите через запятую</span>
          </label>
          <label>
            Научные интересы (через запятую)
            <input
              value={employeeEditInterestsInput}
              onChange={(e) => setEmployeeEditInterestsInput(e.target.value)}
              list="research-interests"
              placeholder="Материаловедение, наноэнзимы"
            />
            <span className="profile-field-hint">Перечислите через запятую или выберите из кнопок ниже</span>
          </label>
          <div className="interest-options">
            {researchInterestOptions.map((item) => (
              <button
                key={item}
                type="button"
                className="ghost-btn"
                onClick={() => addInterestPreset(item, true)}
              >
                + {item}
              </button>
            ))}
          </div>
          <div className="profile-form">
            <div className="profile-label">Лаборатории</div>
            {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте первую.</p>}
            {orgLabs.map((lab) => (
              <label key={lab.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={(employeeEdit.laboratory_ids || []).includes(lab.id)}
                  onChange={() => toggleEmployeeLab(lab.id, true)}
                />
                {lab.name}
              </label>
            ))}
          </div>
          <div className={`profile-form-collapsible ${expandedEditEducation ? "expanded" : ""}`}>
            <button
              type="button"
              className="profile-form-collapsible-header"
              onClick={() => setExpandedEditEducation((prev) => !prev)}
              aria-expanded={expandedEditEducation}
            >
              Образование ({(employeeEdit.education || []).length})
            </button>
            <div className="profile-form-collapsible-body">
              <span className="profile-field-hint" style={{ display: "block", marginBottom: "0.5rem" }}>Нажмите Enter или «Добавить» для добавления</span>
              <div className="inline-form">
                <input
                  ref={editEducationInputRef}
                  placeholder="Университет, факультет, год"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEducation(e.currentTarget.value, true);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <button
                  className="ghost-btn"
                  onClick={() => {
                    const input = editEducationInputRef.current;
                    if (input) {
                      addEducation(input.value, true);
                      input.value = "";
                    }
                  }}
                >
                  Добавить
                </button>
              </div>
              {(employeeEdit.education || []).map((item, index) => (
                <div key={`${item}-${index}`} className="file-item">
                  <span>{item}</span>
                  <button className="file-remove" onClick={() => removeEducation(index, true)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={`profile-form-collapsible ${expandedEditPublications ? "expanded" : ""}`}>
            <button
              type="button"
              className="profile-form-collapsible-header"
              onClick={() => setExpandedEditPublications((prev) => !prev)}
              aria-expanded={expandedEditPublications}
            >
              Публикации ({(employeeEdit.publications || []).length})
            </button>
            <div className="profile-form-collapsible-body">
            {(employeeEdit.publications || []).map((pub, index) => (
              <div key={`pub-${index}`} className="profile-edit">
                <label>
                  Заголовок
                  <input
                    value={pub.title || ""}
                    onChange={(e) => updatePublication(index, "title", e.target.value, true)}
                    placeholder="Название статьи"
                  />
                </label>
                <label>
                  Ссылка
                  <input
                    type="url"
                    value={pub.link || ""}
                    onChange={(e) => updatePublication(index, "link", e.target.value, true)}
                    onBlur={(e) => {
                      const v = (e.target.value || "").trim();
                      if (v) updatePublication(index, "link", normalizeWebsiteInput(v), true);
                    }}
                    placeholder="example.com или https://..."
                  />
                </label>
                <label>
                  Источник
                  <input
                    value={pub.source || ""}
                    onChange={(e) => updatePublication(index, "source", e.target.value, true)}
                    placeholder="Журнал, год"
                  />
                </label>
                <label>
                  Примечание
                  <textarea
                    rows={2}
                    value={pub.notes || ""}
                    onChange={(e) => updatePublication(index, "notes", e.target.value, true)}
                    placeholder="Дополнительно"
                  />
                </label>
                <button className="file-remove" onClick={() => removePublication(index, true)}>
                  Удалить
                </button>
              </div>
            ))}
            <button className="ghost-btn" onClick={() => addPublication(true)}>
              + Добавить публикацию
            </button>
            </div>
          </div>
          <div className="profile-form">
            <div className="profile-label">Индексы цитирования</div>
            <div className="inline-form">
              <label>
                h-index WoS
                <input
                  type="number"
                  value={employeeEdit.hindex_wos ?? ""}
                  onChange={(e) =>
                    handleEmployeeEditChange(
                      "hindex_wos",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="—"
                />
              </label>
              <label>
                h-index Scopus
                <input
                  type="number"
                  value={employeeEdit.hindex_scopus ?? ""}
                  onChange={(e) =>
                    handleEmployeeEditChange(
                      "hindex_scopus",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="—"
                />
              </label>
              <label>
                h-index РИНЦ
                <input
                  type="number"
                  value={employeeEdit.hindex_rsci ?? ""}
                  onChange={(e) =>
                    handleEmployeeEditChange(
                      "hindex_rsci",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="—"
                />
              </label>
              <label>
                h-index OpenAlex
                <input
                  type="number"
                  value={employeeEdit.hindex_openalex ?? ""}
                  onChange={(e) =>
                    handleEmployeeEditChange(
                      "hindex_openalex",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="—"
                />
              </label>
            </div>
          </div>
          <div className="profile-form">
            <div className="profile-label">Контакты</div>
            <label>
              Email
              <input
                type="email"
                value={employeeEdit.contacts?.email || ""}
                onChange={(e) => handleEmployeeContacts("email", e.target.value, true)}
                placeholder="email@example.com"
                autoComplete="email"
              />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                value={employeeEdit.contacts?.phone ? formatPhoneRU(employeeEdit.contacts.phone) : ""}
                onChange={(e) => handleEmployeeContacts("phone", formatPhoneRU(e.target.value), true)}
                placeholder="+7 (999) 123-45-67"
                autoComplete="tel"
                maxLength={18}
              />
              <span className="profile-field-hint">Формат: +7 (999) 123-45-67</span>
            </label>
            <label>
              Сайт
              <input
                type="url"
                value={employeeEdit.contacts?.website || ""}
                onChange={(e) => handleEmployeeContacts("website", e.target.value, true)}
                onBlur={(e) => {
                  const v = (e.target.value || "").trim();
                  if (v) handleEmployeeContacts("website", normalizeWebsiteInput(v), true);
                }}
                placeholder="example.com или https://..."
              />
              <span className="profile-field-hint">Будет отображаться как ссылка</span>
            </label>
            <label>
              Telegram
              <input
                value={employeeEdit.contacts?.telegram || ""}
                onChange={(e) => handleEmployeeContacts("telegram", e.target.value, true)}
                placeholder="@username"
              />
            </label>
          </div>
          <div className="profile-actions">
            <button className="primary-btn" onClick={updateEmployee} disabled={saving}>
              Сохранить
            </button>
            <button className="ghost-btn" onClick={cancelEditEmployee} disabled={saving}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className={`profile-form-collapsible ${expandedNewEmployee ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewEmployee((prev) => !prev)}
          aria-expanded={expandedNewEmployee}
        >
          Новый сотрудник
        </button>
        <div className="profile-form-collapsible-body">
      <div className="profile-form" style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--bg-secondary, #f5f5f5)", borderRadius: "6px" }}>
        <div className="profile-label">Импорт из OpenAlex</div>
        <p className="profile-field-hint" style={{ marginBottom: "0.5rem" }}>
          Введите ORCID или OpenAlex ID для подтягивания ФИО, интересов, образования, публикаций и h-индекса
        </p>
        <div className="inline-form" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <input
            type="text"
            value={employeeDraftImportInput}
            onChange={(e) => setEmployeeDraftImportInput(e.target.value)}
            placeholder="ORCID (0000-0001-6187-6610) или OpenAlex ID (A5023888391)"
            className="profile-input"
            style={{ flex: "1", minWidth: "200px" }}
          />
              <button
                type="button"
                className="profile-btn-integration profile-btn-integration--openalex"
                onClick={handleDraftImport}
                disabled={saving || employeeDraftImporting || !employeeDraftImportInput?.trim()}
              >
                {employeeDraftImporting ? "Импорт..." : "Импортировать"}
              </button>
        </div>
      </div>
      <label>
        ФИО
        <input
          value={employeeDraft.full_name}
          onChange={(e) => handleEmployeeDraftChange("full_name", e.target.value)}
          placeholder="Иванов Иван Иванович"
        />
      </label>
      <label>
        Фото
        <input
          ref={draftPhotoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => uploadEmployeePhoto(e.target.files?.[0], false)}
          disabled={uploading || saving}
        />
      </label>
      {employeeDraft.photo_url && (
        <div className="employee-photo">
          <img src={employeeDraft.photo_url} alt="Фото сотрудника" />
          <button
            className="file-remove"
            onClick={() => setEmployeeDraft((prev) => ({ ...prev, photo_url: "" }))}
          >
            ×
          </button>
        </div>
      )}
      <label>
        Учёная степень / звание
        <input
          value={employeeDraft.academic_degree}
          onChange={(e) => handleEmployeeDraftChange("academic_degree", e.target.value)}
          placeholder="Доктор химических наук"
        />
      </label>
      <label>
        Должности (через запятую)
        <input
          value={employeeDraftPositionInput}
          onChange={(e) => setEmployeeDraftPositionInput(e.target.value)}
          placeholder="Постдок, научный сотрудник"
        />
        <span className="profile-field-hint">Перечислите через запятую</span>
      </label>
      <label>
        Научные интересы (через запятую)
        <input
          value={employeeDraftInterestsInput}
          onChange={(e) => setEmployeeDraftInterestsInput(e.target.value)}
          list="research-interests"
          placeholder="Материаловедение, наноэнзимы"
        />
        <span className="profile-field-hint">Перечислите через запятую или выберите из кнопок ниже</span>
      </label>
      <datalist id="research-interests">
        {researchInterestOptions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <div className="interest-options">
        {researchInterestOptions.map((item) => (
          <button
            key={item}
            type="button"
            className="ghost-btn"
            onClick={() => addInterestPreset(item, false)}
          >
            + {item}
          </button>
        ))}
      </div>
      <div className="profile-form">
        <div className="profile-label">Лаборатории</div>
        {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте первую.</p>}
        {orgLabs.map((lab) => (
          <label key={lab.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={(employeeDraft.laboratory_ids || []).includes(lab.id)}
              onChange={() => toggleEmployeeLab(lab.id, false)}
            />
            {lab.name}
          </label>
        ))}
        <div className="inline-form">
          <input
            value={newLabDraft.name}
            onChange={(e) => setNewLabDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Новая лаборатория"
          />
          <button className="ghost-btn" onClick={createLabFromStaff} disabled={saving}>
            Создать
          </button>
        </div>
      </div>
      <div className={`profile-form-collapsible ${expandedDraftEducation ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedDraftEducation((prev) => !prev)}
          aria-expanded={expandedDraftEducation}
        >
          Образование ({(employeeDraft.education || []).length})
        </button>
        <div className="profile-form-collapsible-body">
          <span className="profile-field-hint" style={{ display: "block", marginBottom: "0.5rem" }}>Нажмите Enter или «Добавить» для добавления</span>
          <div className="inline-form">
            <input
              ref={draftEducationInputRef}
              placeholder="Университет, факультет, год"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEducation(e.currentTarget.value, false);
                  e.currentTarget.value = "";
                }
              }}
            />
            <button
              className="ghost-btn"
              onClick={() => {
                const input = draftEducationInputRef.current;
                if (input) {
                  addEducation(input.value, false);
                  input.value = "";
                }
              }}
            >
              Добавить
            </button>
          </div>
          {(employeeDraft.education || []).map((item, index) => (
            <div key={`${item}-${index}`} className="file-item">
              <span>{item}</span>
              <button className="file-remove" onClick={() => removeEducation(index, false)}>
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className={`profile-form-collapsible ${expandedDraftPublications ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedDraftPublications((prev) => !prev)}
          aria-expanded={expandedDraftPublications}
        >
          Публикации ({(employeeDraft.publications || []).length})
        </button>
        <div className="profile-form-collapsible-body">
        {(employeeDraft.publications || []).map((pub, index) => (
          <div key={`pub-${index}`} className="profile-edit">
            <label>
              Заголовок
              <input
                value={pub.title || ""}
                onChange={(e) => updatePublication(index, "title", e.target.value, false)}
                placeholder="Название статьи"
              />
            </label>
            <label>
              Ссылка
              <input
                type="url"
                value={pub.link || ""}
                onChange={(e) => updatePublication(index, "link", e.target.value, false)}
                onBlur={(e) => {
                  const v = (e.target.value || "").trim();
                  if (v) updatePublication(index, "link", normalizeWebsiteInput(v), false);
                }}
                placeholder="example.com или https://..."
              />
            </label>
            <label>
              Источник
              <input
                value={pub.source || ""}
                onChange={(e) => updatePublication(index, "source", e.target.value, false)}
                placeholder="Журнал, год"
              />
            </label>
            <label>
              Примечание
              <textarea
                rows={2}
                value={pub.notes || ""}
                onChange={(e) => updatePublication(index, "notes", e.target.value, false)}
                placeholder="Дополнительно"
              />
            </label>
            <button
              className="file-remove"
              onClick={() => removePublication(index, false)}
            >
              Удалить
            </button>
          </div>
        ))}
        <button className="ghost-btn" onClick={() => addPublication(false)}>
          + Добавить публикацию
        </button>
        </div>
      </div>
      <div className="profile-form">
        <div className="profile-label">Индексы цитирования</div>
        <div className="inline-form">
          <label>
            h-index WoS
            <input
              type="number"
              value={employeeDraft.hindex_wos ?? ""}
              onChange={(e) =>
                handleEmployeeDraftChange(
                  "hindex_wos",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="—"
            />
          </label>
          <label>
            h-index Scopus
            <input
              type="number"
              value={employeeDraft.hindex_scopus ?? ""}
              onChange={(e) =>
                handleEmployeeDraftChange(
                  "hindex_scopus",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="—"
            />
          </label>
          <label>
            h-index РИНЦ
            <input
              type="number"
              value={employeeDraft.hindex_rsci ?? ""}
              onChange={(e) =>
                handleEmployeeDraftChange(
                  "hindex_rsci",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="—"
            />
          </label>
          <label>
            h-index OpenAlex
            <input
              type="number"
              value={employeeDraft.hindex_openalex ?? ""}
              onChange={(e) =>
                handleEmployeeDraftChange(
                  "hindex_openalex",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              placeholder="—"
            />
          </label>
        </div>
      </div>
      <div className="profile-form">
        <div className="profile-label">Контакты</div>
        <label>
          Email
          <input
            type="email"
            value={employeeDraft.contacts?.email || ""}
            onChange={(e) => handleEmployeeContacts("email", e.target.value, false)}
            placeholder="email@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          Телефон
          <input
            type="tel"
            value={employeeDraft.contacts?.phone ? formatPhoneRU(employeeDraft.contacts.phone) : ""}
            onChange={(e) => handleEmployeeContacts("phone", formatPhoneRU(e.target.value), false)}
            placeholder="+7 (999) 123-45-67"
            autoComplete="tel"
            maxLength={18}
          />
          <span className="profile-field-hint">Формат: +7 (999) 123-45-67</span>
        </label>
        <label>
          Сайт
          <input
            type="url"
            value={employeeDraft.contacts?.website || ""}
            onChange={(e) => handleEmployeeContacts("website", e.target.value, false)}
            onBlur={(e) => {
              const v = (e.target.value || "").trim();
              if (v) handleEmployeeContacts("website", normalizeWebsiteInput(v), false);
            }}
            placeholder="example.com или https://..."
          />
          <span className="profile-field-hint">Будет отображаться как ссылка</span>
        </label>
        <label>
          Telegram
          <input
            value={employeeDraft.contacts?.telegram || ""}
            onChange={(e) => handleEmployeeContacts("telegram", e.target.value, false)}
            placeholder="@username"
          />
        </label>
      </div>
      <button className="primary-btn" onClick={createEmployee} disabled={saving}>
        {saving ? "Сохраняем..." : "Добавить сотрудника"}
      </button>
        </div>
      </div>
    </div>
  );
}
