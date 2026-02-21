import React, { useState } from "react";

/**
 * Вкладка «Вакансии»: список вакансий, форма новой и редактирование.
 * Стиль как у запросов/лабораторий: lab-tab-header, profile-list, lab-card-actions, lab-form-grouped.
 * Связанный запрос и лаборатория — карточка выбранного + очистка или select.
 * Контакт: либо сотрудник (карточка + очистка/select), либо при отсутствии — обязательные email и телефон.
 */
export default function OrgVacanciesTab({
  vacancyDraft,
  setVacancyDraft,
  orgLabs,
  orgEmployees,
  orgQueries,
  createVacancy,
  orgVacancies,
  editingVacancyId,
  vacancyEdit,
  setVacancyEdit,
  updateVacancy,
  cancelEditVacancy,
  startEditVacancy,
  deleteVacancy,
  toggleVacancyPublish,
  saving,
}) {
  const [expandedNewVacancy, setExpandedNewVacancy] = useState(false);

  const renderContactMeta = (vacancy) => {
    if (vacancy.contact_employee || vacancy.contact_employee_id) {
      const name = vacancy.contact_employee?.full_name || orgEmployees.find((e) => e.id === vacancy.contact_employee_id)?.full_name || "—";
      return <span className="profile-list-text small muted">Контакт: {name}</span>;
    }
    if (vacancy.contact_email || vacancy.contact_phone) {
      return (
        <span className="profile-list-text small muted">
          Контакт: {[vacancy.contact_email, vacancy.contact_phone].filter(Boolean).join(" · ")}
        </span>
      );
    }
    return null;
  };

  const renderLinkedQuery = (queryId, setState) => {
    const selected = orgQueries.find((q) => q.id === queryId);
    return (
      <div className="query-linked-task-block">
        {selected ? (
          <div className="query-linked-task-selected">
            <span className="query-linked-task-title">{selected.title}</span>
            <button type="button" className="query-linked-task-clear" onClick={() => setState((prev) => ({ ...prev, query_id: null }))} aria-label="Очистить">×</button>
          </div>
        ) : (
          <select
            className="query-linked-task-select"
            value={queryId || ""}
            onChange={(e) => setState((prev) => ({ ...prev, query_id: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">Не привязывать к запросу</option>
            {orgQueries.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const renderLinkedLab = (laboratoryId, setState) => {
    const selected = orgLabs.find((l) => l.id === laboratoryId);
    return (
      <div className="query-linked-task-block">
        {selected ? (
          <div className="query-linked-task-selected">
            <span className="query-linked-task-title">{selected.name}</span>
            <button type="button" className="query-linked-task-clear" onClick={() => setState((prev) => ({ ...prev, laboratory_id: null }))} aria-label="Очистить">×</button>
          </div>
        ) : (
          <select
            className="query-linked-task-select"
            value={laboratoryId || ""}
            onChange={(e) => setState((prev) => ({ ...prev, laboratory_id: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">Не выбрана</option>
            {orgLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>{lab.name}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const renderContactBlock = (state, setState) => {
    const selectedEmp = state.contact_employee_id ? orgEmployees.find((e) => e.id === state.contact_employee_id) : null;
    const showEmailPhone = !state.contact_employee_id;
    return (
      <>
        <div className="query-linked-task-block">
          {selectedEmp ? (
            <div className="query-linked-task-selected">
              <span className="query-linked-task-title">{selectedEmp.full_name}</span>
              <button type="button" className="query-linked-task-clear" onClick={() => setState((prev) => ({ ...prev, contact_employee_id: null, contact_email: prev.contact_email || "", contact_phone: prev.contact_phone || "" }))} aria-label="Очистить">×</button>
            </div>
          ) : (
            <select
              className="query-linked-task-select"
              value={state.contact_employee_id || ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                setState((prev) => ({ ...prev, contact_employee_id: id, ...(id ? { contact_email: "", contact_phone: "" } : {}) }));
              }}
            >
              <option value="">Указать email и телефон ниже</option>
              {orgEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          )}
        </div>
        {showEmailPhone && (
          <div className="vacancy-contact-fields">
            <p className="profile-field-hint">Если контактное лицо не выбрано, укажите email и телефон для связи (обязательно).</p>
            <label>Email для связи <input type="email" value={state.contact_email || ""} onChange={(e) => setState((prev) => ({ ...prev, contact_email: e.target.value }))} placeholder="contact@example.com" /></label>
            <label>Телефон для связи <input type="tel" value={state.contact_phone || ""} onChange={(e) => setState((prev) => ({ ...prev, contact_phone: e.target.value }))} placeholder="+7 (999) 123-45-67" /></label>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="profile-form">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Добавляйте вакансии, привязывайте к запросам и лабораториям. Укажите контактное лицо (сотрудника) или email и телефон для связи.</p>
        <button type="button" className="primary-btn lab-btn-add" onClick={() => setExpandedNewVacancy(true)}>
          + Добавить вакансию
        </button>
      </div>
      <div className="profile-list">
        {orgVacancies.length === 0 && <p className="muted">Вакансии пока не добавлены.</p>}
        {orgVacancies.map((vacancy) => (
          <div key={vacancy.id} className="profile-list-card">
            <div className="profile-list-content">
              <div className="profile-list-title">
                {vacancy.name}
                <span className={`org-detail-chip org-detail-chip--status ${vacancy.is_published ? "org-detail-chip--published" : "org-detail-chip--draft"}`}>
                  {vacancy.is_published ? "Опубликовано" : "Черновик"}
                </span>
              </div>
              {vacancy.employment_type && (
                <div className="chip-row">
                  <span className="chip">{vacancy.employment_type}</span>
                </div>
              )}
              {vacancy.requirements && <div className="profile-list-text">{vacancy.requirements}</div>}
              {vacancy.description && <div className="profile-list-text">{vacancy.description}</div>}
              <div className="profile-list-meta">
                {(vacancy.query || vacancy.query_id) && (
                  <span className="profile-list-text small muted">
                    Запрос: {vacancy.query?.title || orgQueries.find((q) => q.id === vacancy.query_id)?.title || "—"}
                  </span>
                )}
                {(vacancy.laboratory || vacancy.laboratory_id) && (
                  <span className="profile-list-text small muted">
                    Лаборатория: {vacancy.laboratory?.name || orgLabs.find((l) => l.id === vacancy.laboratory_id)?.name || "—"}
                  </span>
                )}
                {renderContactMeta(vacancy)}
              </div>
            </div>
            {editingVacancyId === vacancy.id && vacancyEdit ? (
              <div className="profile-edit lab-form-grouped">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <label>Название <input value={vacancyEdit.name} onChange={(e) => setVacancyEdit((prev) => ({ ...prev, name: e.target.value }))} placeholder="Например: Исследователь, Постдок" /></label>
                  <label>Требования <textarea rows={2} value={vacancyEdit.requirements} onChange={(e) => setVacancyEdit((prev) => ({ ...prev, requirements: e.target.value }))} placeholder="Образование, опыт, навыки" /></label>
                  <label>Описание <textarea rows={2} value={vacancyEdit.description} onChange={(e) => setVacancyEdit((prev) => ({ ...prev, description: e.target.value }))} placeholder="Обязанности, условия работы" /></label>
                  <label>Тип занятости <input value={vacancyEdit.employment_type || ""} onChange={(e) => setVacancyEdit((prev) => ({ ...prev, employment_type: e.target.value }))} placeholder="Полная занятость, стажировка" /></label>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Связанный запрос</div>
                  <p className="profile-field-hint query-linked-hint">Опционально: привязка к запросу на R&D.</p>
                  {renderLinkedQuery(vacancyEdit.query_id, setVacancyEdit)}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Лаборатория</div>
                  <p className="profile-field-hint query-linked-hint">Лаборатория, в которой открыта вакансия.</p>
                  {renderLinkedLab(vacancyEdit.laboratory_id, setVacancyEdit)}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Контакт для связи</div>
                  {renderContactBlock(vacancyEdit, setVacancyEdit)}
                </div>
                <div className="lab-form-actions">
                  <button className="primary-btn lab-btn-save" onClick={updateVacancy} disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</button>
                  <button className="ghost-btn" onClick={cancelEditVacancy} disabled={saving}>Отмена</button>
                  <button className="ghost-btn" onClick={() => toggleVacancyPublish(vacancy.id, !vacancy.is_published)} disabled={saving}>
                    {vacancy.is_published ? "Снять с публикации" : "Опубликовать"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="lab-card-actions">
                <button className="primary-btn lab-btn-edit" onClick={() => startEditVacancy(vacancy)} disabled={saving}>Редактировать</button>
                <button className="ghost-btn lab-btn-delete" onClick={() => deleteVacancy(vacancy.id)} disabled={saving}>Удалить</button>
                <button className="ghost-btn" onClick={() => toggleVacancyPublish(vacancy.id, !vacancy.is_published)} disabled={saving}>
                  {vacancy.is_published ? "Снять с публикации" : "Опубликовать"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`profile-form-collapsible ${expandedNewVacancy ? "expanded" : ""}`}>
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewVacancy((prev) => !prev)} aria-expanded={expandedNewVacancy}>
          Новая вакансия
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>Название <input value={vacancyDraft.name} onChange={(e) => setVacancyDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Например: Исследователь, Постдок" /></label>
            <label>Требования <textarea rows={2} value={vacancyDraft.requirements} onChange={(e) => setVacancyDraft((prev) => ({ ...prev, requirements: e.target.value }))} placeholder="Образование, опыт, навыки" /></label>
            <label>Описание <textarea rows={2} value={vacancyDraft.description} onChange={(e) => setVacancyDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="Обязанности, условия работы" /></label>
            <label>Тип занятости <input value={vacancyDraft.employment_type || ""} onChange={(e) => setVacancyDraft((prev) => ({ ...prev, employment_type: e.target.value }))} placeholder="Полная занятость, стажировка" /></label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Связанный запрос</div>
            <p className="profile-field-hint query-linked-hint">Опционально: привязка к запросу на R&D.</p>
            {renderLinkedQuery(vacancyDraft.query_id, setVacancyDraft)}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Лаборатория</div>
            <p className="profile-field-hint query-linked-hint">Лаборатория, в которой открыта вакансия.</p>
            {renderLinkedLab(vacancyDraft.laboratory_id, setVacancyDraft)}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Контакт для связи</div>
            {renderContactBlock(vacancyDraft, setVacancyDraft)}
          </div>
          <div className="lab-form-actions lab-form-actions--create">
            <button className="primary-btn lab-btn-save" onClick={createVacancy} disabled={saving}>{saving ? "Сохранение…" : "Создать вакансию"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
