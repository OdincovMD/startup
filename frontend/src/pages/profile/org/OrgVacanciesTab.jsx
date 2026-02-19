import React, { useState } from "react";

/**
 * Общий модуль «Вакансии»: список вакансий (сверху, сворачиваемый), форма новой вакансии.
 * Используется и представителем организации, и представителем лаборатории.
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
  const [expandedVacancies, setExpandedVacancies] = useState(true);
  const [expandedNewVacancy, setExpandedNewVacancy] = useState(false);

  return (
    <div className="profile-form">
      <div className={`profile-card-collapsible ${expandedVacancies ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-card-header"
          onClick={() => setExpandedVacancies((prev) => !prev)}
          aria-expanded={expandedVacancies}
        >
          Вакансии ({orgVacancies.length})
        </button>
        <div className="profile-card-body">
          <div className="profile-list">
            {orgVacancies.length === 0 && <p className="muted">Вакансии пока не добавлены.</p>}
            {orgVacancies.map((vacancy) => (
              <div key={vacancy.id} className="profile-list-card">
                <div className="profile-list-content">
                  <div className="profile-list-title">{vacancy.name}</div>
                  <div className="profile-list-text small muted">
                    {vacancy.is_published ? "Опубликовано" : "Черновик (видно только вам)"}
                  </div>
                  {vacancy.employment_type && (
                    <div className="chip-row">
                      <span className="chip">{vacancy.employment_type}</span>
                    </div>
                  )}
                  {vacancy.requirements && (
                    <div className="profile-list-text">{vacancy.requirements}</div>
                  )}
                  {vacancy.description && (
                    <div className="profile-list-text">{vacancy.description}</div>
                  )}
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
                    {(vacancy.contact_employee || vacancy.contact_employee_id) && (
                      <span className="profile-list-text small muted">
                        Контакт: {vacancy.contact_employee?.full_name || orgEmployees.find((e) => e.id === vacancy.contact_employee_id)?.full_name || "—"}
                      </span>
                    )}
                  </div>
                </div>
                {editingVacancyId === vacancy.id && vacancyEdit ? (
                  <div className="profile-edit">
                    <label>
                      Название
                      <input
                        value={vacancyEdit.name}
                        onChange={(e) => setVacancyEdit((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Исследователь, Постдок"
                      />
                    </label>
                    <label>
                      Требования
                      <textarea
                        rows={2}
                        value={vacancyEdit.requirements}
                        onChange={(e) =>
                          setVacancyEdit((prev) => ({ ...prev, requirements: e.target.value }))
                        }
                        placeholder="Образование, опыт, навыки"
                      />
                    </label>
                    <label>
                      Описание
                      <textarea
                        rows={2}
                        value={vacancyEdit.description}
                        onChange={(e) =>
                          setVacancyEdit((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Обязанности, условия работы"
                      />
                    </label>
                    <label>
                      Тип занятости
                      <input
                        value={vacancyEdit.employment_type}
                        onChange={(e) =>
                          setVacancyEdit((prev) => ({ ...prev, employment_type: e.target.value }))
                        }
                        placeholder="Полная занятость, стажировка, частичная"
                      />
                    </label>
                    <label>
                      Связанный запрос
                      <select
                        value={vacancyEdit.query_id || ""}
                        onChange={(e) =>
                          setVacancyEdit((prev) => ({
                            ...prev,
                            query_id: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                      >
                        <option value="">—</option>
                        {orgQueries.map((query) => (
                          <option key={query.id} value={query.id}>
                            {query.title}
                          </option>
                        ))}
                      </select>
                      <span className="profile-field-hint">
                        {orgQueries.length > 0 ? "Опционально: привязка к запросу на R&D" : "Создайте запросы в разделе «Запросы»"}
                      </span>
                    </label>
                    <label>
                      Лаборатория
                      <select
                        value={vacancyEdit.laboratory_id || ""}
                        onChange={(e) =>
                          setVacancyEdit((prev) => ({
                            ...prev,
                            laboratory_id: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                      >
                        <option value="">—</option>
                        {orgLabs.map((lab) => (
                          <option key={lab.id} value={lab.id}>
                            {lab.name}
                          </option>
                        ))}
                      </select>
                      <span className="profile-field-hint">
                        {orgLabs.length > 0 ? "Лаборатория, в которой открыта вакансия" : "Создайте лабораторию в разделе «Лаборатории»"}
                      </span>
                    </label>
                    <label>
                      Контактное лицо
                      <select
                        value={vacancyEdit.contact_employee_id || ""}
                        onChange={(e) =>
                          setVacancyEdit((prev) => ({
                            ...prev,
                            contact_employee_id: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                      >
                        <option value="">—</option>
                        {orgEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name}
                          </option>
                        ))}
                      </select>
                      <span className="profile-field-hint">
                        {orgEmployees.length > 0 ? "Сотрудник для связи с кандидатами" : "Добавьте сотрудников в разделе «Сотрудники»"}
                      </span>
                    </label>
                    <div className="profile-actions">
                      <button className="primary-btn" onClick={updateVacancy} disabled={saving}>
                        Сохранить
                      </button>
                      <button className="ghost-btn" onClick={cancelEditVacancy} disabled={saving}>
                        Отмена
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => toggleVacancyPublish(vacancy.id, !vacancy.is_published)}
                        disabled={saving}
                      >
                        {vacancy.is_published ? "Снять с публикации" : "Опубликовать"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-actions">
                    <button className="ghost-btn" onClick={() => startEditVacancy(vacancy)} disabled={saving}>
                      Редактировать
                    </button>
                    <button className="ghost-btn" onClick={() => deleteVacancy(vacancy.id)} disabled={saving}>
                      Удалить
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => toggleVacancyPublish(vacancy.id, !vacancy.is_published)}
                      disabled={saving}
                    >
                      {vacancy.is_published ? "Снять с публикации" : "Опубликовать"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`profile-form-collapsible ${expandedNewVacancy ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewVacancy((prev) => !prev)}
          aria-expanded={expandedNewVacancy}
        >
          Новая вакансия
        </button>
        <div className="profile-form-collapsible-body">
      <label>
        Название
        <input
          value={vacancyDraft.name}
          onChange={(e) => setVacancyDraft((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Например: Исследователь, Постдок"
        />
      </label>
      <label>
        Требования
        <textarea
          rows={2}
          value={vacancyDraft.requirements}
          onChange={(e) => setVacancyDraft((prev) => ({ ...prev, requirements: e.target.value }))}
          placeholder="Образование, опыт, навыки"
        />
      </label>
      <label>
        Описание
        <textarea
          rows={2}
          value={vacancyDraft.description}
          onChange={(e) => setVacancyDraft((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Обязанности, условия работы"
        />
      </label>
      <label>
        Тип занятости
        <input
          value={vacancyDraft.employment_type}
          onChange={(e) => setVacancyDraft((prev) => ({ ...prev, employment_type: e.target.value }))}
          placeholder="Полная занятость, стажировка, частичная"
        />
      </label>
      <label>
        Связанный запрос
        <select
          value={vacancyDraft.query_id || ""}
          onChange={(e) =>
            setVacancyDraft((prev) => ({
              ...prev,
              query_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">—</option>
          {orgQueries.map((query) => (
            <option key={query.id} value={query.id}>
              {query.title}
            </option>
          ))}
        </select>
        <span className="profile-field-hint">
          {orgQueries.length > 0 ? "Опционально: привязка к запросу на R&D" : "Создайте запросы в разделе «Запросы»"}
        </span>
      </label>
      <label>
        Лаборатория
        <select
          value={vacancyDraft.laboratory_id || ""}
          onChange={(e) =>
            setVacancyDraft((prev) => ({
              ...prev,
              laboratory_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">—</option>
          {orgLabs.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.name}
            </option>
          ))}
        </select>
        <span className="profile-field-hint">
          {orgLabs.length > 0 ? "Лаборатория, в которой открыта вакансия" : "Создайте лабораторию в разделе «Лаборатории»"}
        </span>
      </label>
      <label>
        Контактное лицо
        <select
          value={vacancyDraft.contact_employee_id || ""}
          onChange={(e) =>
            setVacancyDraft((prev) => ({
              ...prev,
              contact_employee_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">—</option>
          {orgEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
        <span className="profile-field-hint">
          {orgEmployees.length > 0 ? "Сотрудник для связи с кандидатами" : "Добавьте сотрудников в разделе «Сотрудники»"}
        </span>
      </label>
      <button className="primary-btn" onClick={createVacancy} disabled={saving}>
        {saving ? "Сохраняем..." : "Добавить вакансию"}
      </button>
        </div>
      </div>
    </div>
  );
}
