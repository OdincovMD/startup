import React, { useRef, useEffect, useState } from "react";
import { formatPhoneRU, normalizeWebsiteInput } from "../../../utils/validation";

function TagInput({ value = [], onChange, placeholder, id }) {
  const [inputValue, setInputValue] = useState("");
  const handleKeyDown = (e) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  const addTag = () => {
    const trimmed = inputValue.trim().replace(/,+$/, "").trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInputValue("");
  };
  const handleBlur = () => { if (inputValue.trim()) addTag(); };
  return (
    <div className="tag-input-container">
      <div className="tag-input-tags">
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className="tag-input-tag">
            {tag}
            <button type="button" className="tag-input-tag-remove" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Удалить ${tag}`}>×</button>
          </span>
        ))}
        <input id={id} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleBlur} placeholder={value.length === 0 ? placeholder : ""} className="tag-input-field" />
      </div>
    </div>
  );
}

function capitalizeEachWord(str) {
  if (!str || typeof str !== "string") return str;
  return str.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * Общий модуль «Сотрудники»: форма нового сотрудника, редактирование, список.
 */
export default function StaffTab({
  employeeDraft,
  handleEmployeeDraftChange,
  setEmployeeDraft,
  uploadEmployeePhoto,
  employeeDraftPositionInput,
  setEmployeeDraftPositionInput,
  orgLabs,
  toggleEmployeeLab,
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

  const interestsList = (emp) => {
    const arr = Array.isArray(emp?.research_interests) ? emp.research_interests : (typeof emp?.research_interests === "string" ? (emp.research_interests || "").split(",").map((s) => s.trim()).filter(Boolean) : []);
    return arr;
  };

  return (
    <div className="profile-form">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Добавляйте сотрудников организации. Можно импортировать данные из OpenAlex.</p>
        <button type="button" className="primary-btn lab-btn-add" onClick={() => setExpandedNewEmployee(true)}>
          + Добавить сотрудника
        </button>
      </div>
      <div className="profile-list">
        {orgEmployees.length === 0 && <p className="muted">Сотрудники пока не добавлены.</p>}
        {orgEmployees.map((employee) => (
          <div key={employee.id} className="profile-list-card employee-card">
            <div className="profile-list-content">
              <div className="employee-photo employee-photo-small">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt={employee.full_name} />
                ) : (
                  <div className="employee-photo-placeholder" aria-hidden="true">
                    {employee.full_name ? employee.full_name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </div>
              <div className="profile-list-main">
                <div className="profile-list-title">{employee.full_name}</div>
                {employee.academic_degree && <div className="profile-list-text">{employee.academic_degree}</div>}
                {(employee.positions || []).length > 0 && <div className="profile-list-text">{employee.positions.join(", ")}</div>}
                {interestsList(employee).length > 0 && (
                  <div className="chip-row">
                    {interestsList(employee).slice(0, 5).map((interest) => <span key={interest} className="chip">{interest}</span>)}
                    {interestsList(employee).length > 5 && <span className="chip muted">+{interestsList(employee).length - 5}</span>}
                  </div>
                )}
                {(employee.education || []).length > 0 && (
                  <div className="profile-list-text small muted">
                    Образование: {(employee.education || []).slice(0, 2).join("; ")}
                    {(employee.education || []).length > 2 && " …"}
                  </div>
                )}
                {(employee.laboratories || []).length > 0 && (
                  <div className="chip-row">
                    {employee.laboratories.map((lab) => <span key={lab.id} className="chip">{lab.name}</span>)}
                  </div>
                )}
                {(employee.hindex_wos != null || employee.hindex_scopus != null || employee.hindex_rsci != null || employee.hindex_openalex != null) && (
                  <div className="profile-list-text small muted">
                    h-index: WoS {employee.hindex_wos ?? "—"} / Scopus {employee.hindex_scopus ?? "—"} / РИНЦ {employee.hindex_rsci ?? "—"} / OpenAlex {employee.hindex_openalex ?? "—"}
                  </div>
                )}
                {employee.contacts && (employee.contacts.email || employee.contacts.phone) && (
                  <div className="profile-list-text small muted">
                    {employee.contacts.email || ""}{(employee.contacts.email && employee.contacts.phone) ? " • " : ""}{employee.contacts.phone || ""}
                  </div>
                )}
              </div>
            </div>
            <div className="lab-card-actions">
              <button type="button" className="primary-btn lab-btn-edit" onClick={() => startEditEmployee(employee)} disabled={saving}>Редактировать</button>
              <button type="button" className="ghost-btn" onClick={() => { setEmployeePreview(employee); setShowEmployeePublications(false); }} disabled={saving}>Профиль</button>
              <button type="button" className="ghost-btn lab-btn-delete" onClick={() => deleteEmployee(employee.id)} disabled={saving}>Удалить</button>
            </div>
          </div>
        ))}
      </div>

      {employeeEditId && employeeEdit && (
        <div className="profile-edit lab-form-grouped">
          <h4 className="profile-form-group-title">Редактирование: {employeeEdit.full_name || "Сотрудник"}</h4>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Импорт из OpenAlex</div>
            <div className="orcid-status orcid-status--disconnected openalex-status">
              <p className="profile-field-hint" style={{ margin: 0 }}>Введите ORCID или OpenAlex ID для подтягивания ФИО, интересов, образования, публикаций и h-индекса</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  value={employeeImportInput}
                  onChange={(e) => setEmployeeImportInput(e.target.value)}
                  placeholder="ORCID (0000-0001-6187-6610) или OpenAlex ID (A5023888391)"
                  className="profile-input"
                />
                <button
                  type="button"
                  className="profile-btn-integration profile-btn-integration--openalex"
                  onClick={handleEmployeeImport}
                  disabled={saving || employeeImporting || !employeeImportInput?.trim()}
                >
                  {employeeImporting ? "Импорт…" : "Импорт из OpenAlex"}
                </button>
              </div>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>
              ФИО
              <input
                value={employeeEdit.full_name}
                onChange={(e) => handleEmployeeEditChange("full_name", e.target.value)}
                onBlur={(e) => { const v = capitalizeEachWord(e.target.value); if (v !== e.target.value) handleEmployeeEditChange("full_name", v); }}
                placeholder="Иванов Иван Иванович"
              />
            </label>
            <label>
              Фото
              <input ref={editPhotoInputRef} type="file" accept="image/*" onChange={(e) => uploadEmployeePhoto(e.target.files?.[0], true)} disabled={uploading || saving} />
            </label>
            {employeeEdit.photo_url && (
              <div className="employee-photo">
                <img src={employeeEdit.photo_url} alt="Фото" />
                <button type="button" className="file-remove" onClick={() => handleEmployeeEditChange("photo_url", "")}>×</button>
              </div>
            )}
            <label>
              Учёная степень / звание
              <input value={employeeEdit.academic_degree} onChange={(e) => handleEmployeeEditChange("academic_degree", e.target.value)} placeholder="Доктор химических наук" />
            </label>
            <label>
              Должность
              <input
                value={employeeEditPositionInput}
                onChange={(e) => setEmployeeEditPositionInput(e.target.value)}
                placeholder="Ведущий научный сотрудник, постдок"
              />
            </label>
            <label htmlFor="employee-edit-interests">
              Научные интересы
              <TagInput
                id="employee-edit-interests"
                value={employeeEdit.research_interests || []}
                onChange={(v) => handleEmployeeEditChange("research_interests", v)}
                placeholder="Введите интерес и нажмите запятую или Enter"
              />
            </label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Лаборатории</div>
            {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>}
            {orgLabs.length > 0 && (
              <div className="lab-employees-list">
                {orgLabs.map((lab) => (
                  <label key={lab.id} className="lab-employee-chip">
                    <input type="checkbox" checked={(employeeEdit.laboratory_ids || []).includes(lab.id)} onChange={() => toggleEmployeeLab(lab.id, true)} />
                    <span className="lab-employee-chip-name">{lab.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <button type="button" className="collapsible-header" onClick={() => setExpandedEditEducation((prev) => !prev)} aria-expanded={expandedEditEducation}>
              <span>Образование ({(employeeEdit.education || []).length})</span>
              <span className={`collapsible-arrow ${expandedEditEducation ? "expanded" : ""}`}>▼</span>
            </button>
            {expandedEditEducation && (
              <div className="collapsible-content">
                <div className="inline-form">
                  <input ref={editEducationInputRef} placeholder="Университет, факультет, год" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEducation(e.currentTarget.value, true); e.currentTarget.value = ""; } }} />
                  <button type="button" className="ghost-btn" onClick={() => { const input = editEducationInputRef.current; if (input) { addEducation(input.value, true); input.value = ""; } }}>Добавить</button>
                </div>
                <span className="profile-field-hint">Введите и нажмите Enter или «Добавить»</span>
                {(employeeEdit.education || []).length > 0 && (
                  <div className="education-list">
                    {(employeeEdit.education || []).map((item, index) => (
                      <div key={`edu-${index}`} className="education-item">
                        <span>{item}</span>
                        <button type="button" className="file-remove" onClick={() => removeEducation(index, true)} aria-label="Удалить">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <button type="button" className="collapsible-header" onClick={() => setExpandedEditPublications((prev) => !prev)} aria-expanded={expandedEditPublications}>
              <span>Публикации ({(employeeEdit.publications || []).length})</span>
              <span className={`collapsible-arrow ${expandedEditPublications ? "expanded" : ""}`}>▼</span>
            </button>
            {expandedEditPublications && (
              <div className="collapsible-content">
                <div className="publications-actions">
                  <button type="button" className="ghost-btn" onClick={() => addPublication(true)}>+ Добавить публикацию</button>
                </div>
                {(employeeEdit.publications || []).length === 0 && <p className="profile-field-hint">Нет добавленных публикаций</p>}
                {(employeeEdit.publications || []).map((pub, index) => (
                  <div key={`pub-${index}`} className="publication-card">
                    <div className="publication-card-fields">
                      <input value={pub.title || ""} onChange={(e) => updatePublication(index, "title", e.target.value, true)} placeholder="Название статьи" className="publication-title-input" />
                      <input type="url" value={pub.link || ""} onChange={(e) => updatePublication(index, "link", e.target.value, true)} onBlur={(e) => { const v = (e.target.value || "").trim(); if (v) updatePublication(index, "link", normalizeWebsiteInput(v), true); }} placeholder="Ссылка (DOI, URL)" className="publication-link-input" />
                    </div>
                    <button type="button" className="publication-remove" onClick={() => removePublication(index, true)} aria-label="Удалить публикацию">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Индексы цитирования</div>
            <div className="researcher-hindex-grid">
              <label>h-index WoS <input type="number" value={employeeEdit.hindex_wos ?? ""} onChange={(e) => handleEmployeeEditChange("hindex_wos", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
              <label>h-index Scopus <input type="number" value={employeeEdit.hindex_scopus ?? ""} onChange={(e) => handleEmployeeEditChange("hindex_scopus", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
              <label>h-index РИНЦ <input type="number" value={employeeEdit.hindex_rsci ?? ""} onChange={(e) => handleEmployeeEditChange("hindex_rsci", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
              <label>h-index OpenAlex <input type="number" value={employeeEdit.hindex_openalex ?? ""} onChange={(e) => handleEmployeeEditChange("hindex_openalex", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Контакты</div>
            <label>Email <input type="email" value={employeeEdit.contacts?.email || ""} onChange={(e) => handleEmployeeContacts("email", e.target.value, true)} placeholder="email@example.com" autoComplete="email" /></label>
            <label>Телефон <input type="tel" value={employeeEdit.contacts?.phone ? formatPhoneRU(employeeEdit.contacts.phone) : ""} onChange={(e) => handleEmployeeContacts("phone", formatPhoneRU(e.target.value), true)} placeholder="+7 (999) 123-45-67" autoComplete="tel" maxLength={18} /><span className="profile-field-hint">Формат: +7 (999) 123-45-67</span></label>
            <label>Сайт <input type="url" value={employeeEdit.contacts?.website || ""} onChange={(e) => handleEmployeeContacts("website", e.target.value, true)} onBlur={(e) => { const v = (e.target.value || "").trim(); if (v) handleEmployeeContacts("website", normalizeWebsiteInput(v), true); }} placeholder="example.com или https://..." /><span className="profile-field-hint">Будет отображаться как ссылка</span></label>
            <label>Telegram <input value={employeeEdit.contacts?.telegram || ""} onChange={(e) => handleEmployeeContacts("telegram", e.target.value, true)} placeholder="@username" /></label>
          </div>
          <div className="lab-form-actions">
            <button className="primary-btn lab-btn-save" onClick={updateEmployee} disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</button>
            <button className="ghost-btn" onClick={cancelEditEmployee} disabled={saving}>Отмена</button>
          </div>
        </div>
      )}

      <div className={`profile-form-collapsible ${expandedNewEmployee ? "expanded" : ""}`}>
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewEmployee((prev) => !prev)} aria-expanded={expandedNewEmployee}>
          Новый сотрудник
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Импорт из OpenAlex</div>
            <div className="orcid-status orcid-status--disconnected openalex-status">
              <p className="profile-field-hint" style={{ margin: 0 }}>Введите ORCID или OpenAlex ID для подтягивания ФИО, интересов, образования, публикаций и h-индекса</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <input type="text" value={employeeDraftImportInput} onChange={(e) => setEmployeeDraftImportInput(e.target.value)} placeholder="ORCID (0000-0001-6187-6610) или OpenAlex ID (A5023888391)" className="profile-input" />
                <button type="button" className="profile-btn-integration profile-btn-integration--openalex" onClick={handleDraftImport} disabled={saving || employeeDraftImporting || !employeeDraftImportInput?.trim()}>
                  {employeeDraftImporting ? "Импорт…" : "Импорт из OpenAlex"}
                </button>
              </div>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>
              ФИО
              <input value={employeeDraft.full_name} onChange={(e) => handleEmployeeDraftChange("full_name", e.target.value)} onBlur={(e) => { const v = capitalizeEachWord(e.target.value); if (v !== e.target.value) handleEmployeeDraftChange("full_name", v); }} placeholder="Иванов Иван Иванович" />
            </label>
            <label>Фото <input ref={draftPhotoInputRef} type="file" accept="image/*" onChange={(e) => uploadEmployeePhoto(e.target.files?.[0], false)} disabled={uploading || saving} /></label>
            {employeeDraft.photo_url && <div className="employee-photo"><img src={employeeDraft.photo_url} alt="Фото" /><button type="button" className="file-remove" onClick={() => handleEmployeeDraftChange("photo_url", "")}>×</button></div>}
            <label>Учёная степень / звание <input value={employeeDraft.academic_degree} onChange={(e) => handleEmployeeDraftChange("academic_degree", e.target.value)} placeholder="Доктор химических наук" /></label>
            <label>Должность <input value={employeeDraftPositionInput} onChange={(e) => setEmployeeDraftPositionInput(e.target.value)} placeholder="Ведущий научный сотрудник, постдок" /></label>
            <label htmlFor="employee-draft-interests">Научные интересы <TagInput id="employee-draft-interests" value={employeeDraft.research_interests || []} onChange={(v) => handleEmployeeDraftChange("research_interests", v)} placeholder="Введите интерес и нажмите запятую или Enter" /></label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Лаборатории</div>
            {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>}
            {orgLabs.length > 0 && (
              <div className="lab-employees-list">
                {orgLabs.map((lab) => (
                  <label key={lab.id} className="lab-employee-chip">
                    <input type="checkbox" checked={(employeeDraft.laboratory_ids || []).includes(lab.id)} onChange={() => toggleEmployeeLab(lab.id, false)} />
                    <span className="lab-employee-chip-name">{lab.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <button type="button" className="collapsible-header" onClick={() => setExpandedDraftEducation((prev) => !prev)} aria-expanded={expandedDraftEducation}>
              <span>Образование ({(employeeDraft.education || []).length})</span>
              <span className={`collapsible-arrow ${expandedDraftEducation ? "expanded" : ""}`}>▼</span>
            </button>
            {expandedDraftEducation && (
              <div className="collapsible-content">
                <div className="inline-form">
                  <input ref={draftEducationInputRef} placeholder="Университет, факультет, год" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEducation(e.currentTarget.value, false); e.currentTarget.value = ""; } }} />
                  <button type="button" className="ghost-btn" onClick={() => { const input = draftEducationInputRef.current; if (input) { addEducation(input.value, false); input.value = ""; } }}>Добавить</button>
                </div>
                <span className="profile-field-hint">Введите и нажмите Enter или «Добавить»</span>
                {(employeeDraft.education || []).length > 0 && (
                  <div className="education-list">
                    {(employeeDraft.education || []).map((item, index) => (
                      <div key={`edu-${index}`} className="education-item">
                        <span>{item}</span>
                        <button type="button" className="file-remove" onClick={() => removeEducation(index, false)} aria-label="Удалить">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <button type="button" className="collapsible-header" onClick={() => setExpandedDraftPublications((prev) => !prev)} aria-expanded={expandedDraftPublications}>
              <span>Публикации ({(employeeDraft.publications || []).length})</span>
              <span className={`collapsible-arrow ${expandedDraftPublications ? "expanded" : ""}`}>▼</span>
            </button>
            {expandedDraftPublications && (
              <div className="collapsible-content">
                <div className="publications-actions"><button type="button" className="ghost-btn" onClick={() => addPublication(false)}>+ Добавить публикацию</button></div>
                {(employeeDraft.publications || []).length === 0 && <p className="profile-field-hint">Нет добавленных публикаций</p>}
                {(employeeDraft.publications || []).map((pub, index) => (
                  <div key={`pub-${index}`} className="publication-card">
                    <div className="publication-card-fields">
                      <input value={pub.title || ""} onChange={(e) => updatePublication(index, "title", e.target.value, false)} placeholder="Название статьи" className="publication-title-input" />
                      <input type="url" value={pub.link || ""} onChange={(e) => updatePublication(index, "link", e.target.value, false)} onBlur={(e) => { const v = (e.target.value || "").trim(); if (v) updatePublication(index, "link", normalizeWebsiteInput(v), false); }} placeholder="Ссылка (DOI, URL)" className="publication-link-input" />
                    </div>
                    <button type="button" className="publication-remove" onClick={() => removePublication(index, false)} aria-label="Удалить публикацию">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Индексы цитирования</div>
            <div className="researcher-hindex-grid">
              <label>h-index WoS <input type="number" value={employeeDraft.hindex_wos ?? ""} onChange={(e) => handleEmployeeDraftChange("hindex_wos", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
              <label>h-index Scopus <input type="number" value={employeeDraft.hindex_scopus ?? ""} onChange={(e) => handleEmployeeDraftChange("hindex_scopus", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
              <label>h-index РИНЦ <input type="number" value={employeeDraft.hindex_rsci ?? ""} onChange={(e) => handleEmployeeDraftChange("hindex_rsci", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
              <label>h-index OpenAlex <input type="number" value={employeeDraft.hindex_openalex ?? ""} onChange={(e) => handleEmployeeDraftChange("hindex_openalex", e.target.value ? Number(e.target.value) : null)} placeholder="—" min="0" /></label>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Контакты</div>
            <label>Email <input type="email" value={employeeDraft.contacts?.email || ""} onChange={(e) => handleEmployeeContacts("email", e.target.value, false)} placeholder="email@example.com" autoComplete="email" /></label>
            <label>Телефон <input type="tel" value={employeeDraft.contacts?.phone ? formatPhoneRU(employeeDraft.contacts.phone) : ""} onChange={(e) => handleEmployeeContacts("phone", formatPhoneRU(e.target.value), false)} placeholder="+7 (999) 123-45-67" autoComplete="tel" maxLength={18} /><span className="profile-field-hint">Формат: +7 (999) 123-45-67</span></label>
            <label>Сайт <input type="url" value={employeeDraft.contacts?.website || ""} onChange={(e) => handleEmployeeContacts("website", e.target.value, false)} onBlur={(e) => { const v = (e.target.value || "").trim(); if (v) handleEmployeeContacts("website", normalizeWebsiteInput(v), false); }} placeholder="example.com или https://..." /><span className="profile-field-hint">Будет отображаться как ссылка</span></label>
            <label>Telegram <input value={employeeDraft.contacts?.telegram || ""} onChange={(e) => handleEmployeeContacts("telegram", e.target.value, false)} placeholder="@username" /></label>
          </div>
          <div className="lab-form-actions lab-form-actions--create">
            <button className="primary-btn lab-btn-save" onClick={createEmployee} disabled={saving}>{saving ? "Сохранение…" : "Создать сотрудника"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
