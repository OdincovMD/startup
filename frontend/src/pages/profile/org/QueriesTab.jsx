import React, { useState, useRef } from "react";

const STATUS_OPTIONS = [
  { value: "active", label: "Активный", hint: "Запрос открыт для откликов" },
  { value: "paused", label: "На паузе", hint: "Временно приостановлен" },
  { value: "closed", label: "Закрыт", hint: "Запрос завершён" },
];

/**
 * Модуль «Запросы»: список запросов, форма нового запроса, редактирование.
 * Стиль как у карточек лабораторий, оборудования и задач.
 */
export default function QueriesTab({
  queryDraft,
  setQueryDraft,
  orgLabs,
  orgEmployees,
  orgTasks,
  toggleQueryLab,
  toggleQueryEmployee,
  createQuery,
  orgQueries,
  editingQueryId,
  queryEdit,
  setQueryEdit,
  updateQuery,
  cancelEditQuery,
  startEditQuery,
  deleteQuery,
  toggleQueryPublish,
  saving,
}) {
  const [expandedNewQuery, setExpandedNewQuery] = useState(false);
  const newQueryRef = useRef(null);
  const listRef = useRef(null);

  const handleAddQueryClick = () => {
    setExpandedNewQuery(true);
    requestAnimationFrame(() => {
      if (newQueryRef.current) {
        newQueryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleCreateQuery = async () => {
    const ok = await createQuery();
    if (ok) {
      setExpandedNewQuery(false);
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
        <p className="lab-tab-desc">Создавайте запросы на решение задач, указывайте бюджет, сроки и грант. Привязывайте к лабораториям и сотрудникам.</p>
        <button type="button" className="primary-btn lab-btn-add" onClick={handleAddQueryClick}>
          + Добавить запрос
        </button>
      </div>
      <div className="profile-list" ref={listRef}>
        {orgQueries.length === 0 && <p className="muted">Запросы пока не добавлены.</p>}
        {orgQueries.map((query) => (
          <div key={query.id} className="profile-list-card query-card">
            <div className="profile-list-content">
              <div className="profile-list-title">
                {query.title}
                <span
                  className={`org-detail-chip org-detail-chip--status ${query.is_published ? "org-detail-chip--published" : "org-detail-chip--draft"}`}
                  title={query.is_published ? "Запрос опубликован" : "Черновик запроса"}
                >
                  {query.is_published ? "Опубликован" : "Черновик"}
                </span>
              </div>
              <div className="profile-list-text small muted">
                {query.status && `Статус: ${STATUS_OPTIONS.find((o) => o.value === query.status)?.label || query.status}`}
              </div>
              {query.task_description && (
                <div className="profile-list-text" title={query.task_description}>
                  {query.task_description.length > 140
                    ? `${query.task_description.slice(0, 140)}…`
                    : query.task_description}
                </div>
              )}
              {query.completed_examples && <div className="profile-list-text small muted">{query.completed_examples}</div>}
              {(query.grant_info || query.budget || query.deadline) && (
                <div className="profile-list-text small muted">
                  {query.grant_info && <span>Грант: {query.grant_info}</span>}
                  {query.grant_info && (query.budget || query.deadline) && " · "}
                  {query.budget && <span>Бюджет: {query.budget}</span>}
                  {query.budget && query.deadline && " · "}
                  {query.deadline && <span>Дедлайн: {query.deadline}</span>}
                </div>
              )}
              {query.status && <span className="profile-list-text small muted">Статус: {STATUS_OPTIONS.find((o) => o.value === query.status)?.label || query.status}</span>}
              {query.linked_task_solution && (
                <div className="profile-list-text small muted">Решённая задача: {query.linked_task_solution.title}</div>
              )}
              {(query.laboratories || []).length > 0 && (
                <div className="chip-row">
                  {query.laboratories.map((lab) => <span key={lab.id} className="chip">{lab.name}</span>)}
                </div>
              )}
              {(query.employees || []).length > 0 && (
                <div className="chip-row">
                  {query.employees.map((emp) => <span key={emp.id} className="chip">{emp.full_name}</span>)}
                </div>
              )}
              {(query.vacancies || []).length > 0 && (
                <div className="chip-row">
                  {query.vacancies.map((v) => <span key={v.id} className="chip">{v.name}</span>)}
                </div>
              )}
            </div>
            {editingQueryId === query.id && queryEdit ? (
              <div className="profile-edit lab-form-grouped">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <label>Название <input value={queryEdit.title} onChange={(e) => setQueryEdit((prev) => ({ ...prev, title: e.target.value }))} placeholder="Например: Разработка аналитического метода" /></label>
                  <label>Описание задачи <textarea rows={3} value={queryEdit.task_description} onChange={(e) => setQueryEdit((prev) => ({ ...prev, task_description: e.target.value }))} placeholder="Опишите задачу, проблему и ожидаемый результат" /></label>
                  <label>Примеры и кейсы <textarea rows={2} value={queryEdit.completed_examples} onChange={(e) => setQueryEdit((prev) => ({ ...prev, completed_examples: e.target.value }))} placeholder="Пилотные проекты, внедрения, похожие решения" /></label>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Бюджет, сроки и грант</div>
                  <label>Грант <input value={queryEdit.grant_info || ""} onChange={(e) => setQueryEdit((prev) => ({ ...prev, grant_info: e.target.value }))} placeholder="Название или номер гранта" /></label>
                  <label>Бюджет <input value={queryEdit.budget} onChange={(e) => setQueryEdit((prev) => ({ ...prev, budget: e.target.value }))} placeholder="Диапазон или сумма, руб." /></label>
                  <label>Дедлайн <input value={queryEdit.deadline} onChange={(e) => setQueryEdit((prev) => ({ ...prev, deadline: e.target.value }))} placeholder="ДД.ММ.ГГГГ или квартал 2026" /></label>
                  <div className="query-field query-field-status">
                    <span className="query-field-label">Статус</span>
                    <div className="query-status-selector">
                      {STATUS_OPTIONS.map((opt) => (
                        <label key={opt.value} className="query-status-option">
                          <input type="radio" name="query-edit-status" value={opt.value} checked={(queryEdit.status || "active") === opt.value} onChange={() => setQueryEdit((prev) => ({ ...prev, status: opt.value }))} />
                          <span className="query-status-option-label" title={opt.hint}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Связанная решённая задача</div>
                  <p className="profile-field-hint query-linked-hint">Привяжите запрос к уже решённой задаче, если это продолжение или развитие проекта.</p>
                  <div className="query-linked-task-block">
                    {(queryEdit.linked_task_solution_id && orgTasks.find((t) => t.id === queryEdit.linked_task_solution_id)) ? (
                      <div className="query-linked-task-selected">
                        <span className="query-linked-task-title">{orgTasks.find((t) => t.id === queryEdit.linked_task_solution_id)?.title}</span>
                        <button type="button" className="query-linked-task-clear" onClick={() => setQueryEdit((prev) => ({ ...prev, linked_task_solution_id: null }))} aria-label="Очистить">×</button>
                      </div>
                    ) : (
                      <select className="query-linked-task-select" value={queryEdit.linked_task_solution_id || ""} onChange={(e) => setQueryEdit((prev) => ({ ...prev, linked_task_solution_id: e.target.value ? Number(e.target.value) : null }))}>
                        <option value="">Не привязывать к задаче</option>
                        {orgTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Лаборатории</div>
                  {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>}
                  {orgLabs.length > 0 && (
                    <div className="lab-employees-list">
                      {orgLabs.map((lab) => (
                        <label key={lab.id} className="lab-employee-chip">
                          <input type="checkbox" checked={(queryEdit.laboratory_ids || []).includes(lab.id)} onChange={() => toggleQueryLab(lab.id, true)} />
                          <span className="lab-employee-chip-name">{lab.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Ответственные сотрудники</div>
                  {orgEmployees.length === 0 && <p className="muted">Сотрудников пока нет — добавьте в разделе «Сотрудники».</p>}
                  {orgEmployees.length > 0 && (
                    <div className="lab-employees-list">
                      {orgEmployees.map((employee) => (
                        <label key={employee.id} className="lab-employee-chip">
                          <input type="checkbox" checked={(queryEdit.employee_ids || []).includes(employee.id)} onChange={() => toggleQueryEmployee(employee.id, true)} />
                          <span className="lab-employee-chip-name">{employee.full_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="lab-form-actions">
                  <button className="primary-btn lab-btn-save" onClick={updateQuery} disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</button>
                  <button className="ghost-btn" onClick={cancelEditQuery} disabled={saving}>Отмена</button>
                  <button className="ghost-btn" onClick={() => toggleQueryPublish(query.id, !query.is_published)} disabled={saving}>
                    {query.is_published ? "Снять с публикации" : "Опубликовать"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="lab-card-actions">
                <button className="primary-btn lab-btn-edit" onClick={() => startEditQuery(query)} disabled={saving}>Редактировать</button>
                <button className="ghost-btn lab-btn-delete" onClick={() => deleteQuery(query.id)} disabled={saving}>Удалить</button>
                <button className="ghost-btn" onClick={() => toggleQueryPublish(query.id, !query.is_published)} disabled={saving}>
                  {query.is_published ? "Снять с публикации" : "Опубликовать"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        ref={newQueryRef}
        className={`profile-form-collapsible ${expandedNewQuery ? "expanded" : ""}`}
      >
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewQuery((prev) => !prev)} aria-expanded={expandedNewQuery}>
          Новый запрос
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>Название <input value={queryDraft.title} onChange={(e) => setQueryDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Например: Разработка аналитического метода" /></label>
            <label>Описание задачи <textarea rows={3} value={queryDraft.task_description} onChange={(e) => setQueryDraft((prev) => ({ ...prev, task_description: e.target.value }))} placeholder="Опишите задачу, проблему и ожидаемый результат" /></label>
            <label>Примеры и кейсы <textarea rows={2} value={queryDraft.completed_examples} onChange={(e) => setQueryDraft((prev) => ({ ...prev, completed_examples: e.target.value }))} placeholder="Пилотные проекты, внедрения, похожие решения" /></label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Бюджет, сроки и грант</div>
            <label>Грант <input value={queryDraft.grant_info} onChange={(e) => setQueryDraft((prev) => ({ ...prev, grant_info: e.target.value }))} placeholder="Название или номер гранта" /></label>
            <label>Бюджет <input value={queryDraft.budget} onChange={(e) => setQueryDraft((prev) => ({ ...prev, budget: e.target.value }))} placeholder="Диапазон или сумма, руб." /></label>
            <label>Дедлайн <input value={queryDraft.deadline} onChange={(e) => setQueryDraft((prev) => ({ ...prev, deadline: e.target.value }))} placeholder="ДД.ММ.ГГГГ или квартал 2026" /></label>
            <div className="query-field query-field-status">
              <span className="query-field-label">Статус</span>
              <div className="query-status-selector">
                {STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="query-status-option">
                    <input type="radio" name="query-draft-status" value={opt.value} checked={(queryDraft.status || "active") === opt.value} onChange={() => setQueryDraft((prev) => ({ ...prev, status: opt.value }))} />
                    <span className="query-status-option-label" title={opt.hint}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Связанная решённая задача</div>
            <p className="profile-field-hint query-linked-hint">Привяжите запрос к уже решённой задаче, если это продолжение или развитие проекта.</p>
            <div className="query-linked-task-block">
              {(queryDraft.linked_task_solution_id && orgTasks.find((t) => t.id === queryDraft.linked_task_solution_id)) ? (
                <div className="query-linked-task-selected">
                  <span className="query-linked-task-title">{orgTasks.find((t) => t.id === queryDraft.linked_task_solution_id)?.title}</span>
                  <button type="button" className="query-linked-task-clear" onClick={() => setQueryDraft((prev) => ({ ...prev, linked_task_solution_id: null }))} aria-label="Очистить">×</button>
                </div>
              ) : (
                <select className="query-linked-task-select" value={queryDraft.linked_task_solution_id || ""} onChange={(e) => setQueryDraft((prev) => ({ ...prev, linked_task_solution_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">Не привязывать к задаче</option>
                  {orgTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Лаборатории</div>
            {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>}
            {orgLabs.length > 0 && (
              <div className="lab-employees-list">
                {orgLabs.map((lab) => (
                  <label key={lab.id} className="lab-employee-chip">
                    <input type="checkbox" checked={(queryDraft.laboratory_ids || []).includes(lab.id)} onChange={() => toggleQueryLab(lab.id, false)} />
                    <span className="lab-employee-chip-name">{lab.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Ответственные сотрудники</div>
            {orgEmployees.length === 0 && <p className="muted">Сотрудников пока нет — добавьте в разделе «Сотрудники».</p>}
            {orgEmployees.length > 0 && (
              <div className="lab-employees-list">
                {orgEmployees.map((employee) => (
                  <label key={employee.id} className="lab-employee-chip">
                    <input type="checkbox" checked={(queryDraft.employee_ids || []).includes(employee.id)} onChange={() => toggleQueryEmployee(employee.id, false)} />
                    <span className="lab-employee-chip-name">{employee.full_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="lab-form-actions lab-form-actions--create">
            <button className="primary-btn lab-btn-save" onClick={handleCreateQuery} disabled={saving}>{saving ? "Сохранение…" : "Создать запрос"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
