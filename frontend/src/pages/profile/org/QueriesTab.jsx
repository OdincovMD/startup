import React, { useState, useRef } from "react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";

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
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>Запросы</h2>
        <Button variant="primary" onClick={handleAddQueryClick}>
          + Добавить запрос
        </Button>
      </div>
      <p className="profile-section-desc" style={{ marginBottom: "1.5rem" }}>
        Создавайте запросы на решение задач, указывайте бюджет, сроки и грант. Привязывайте к лабораториям и сотрудникам.
      </p>
      <div className="profile-list" ref={listRef}>
        {orgQueries.length === 0 && (
          <div className="profile-empty-state">
            Запросы пока не добавлены.
          </div>
        )}
        {orgQueries.map((query) => (
          <Card key={query.id} variant="elevated" padding="md" className="dashboard-list-item query-card">
            <div className="dashboard-list-item__title-row">
              <h4 className="dashboard-list-item__title">{query.title}</h4>
              <Badge variant={query.is_published ? "published" : "draft"} className="dashboard-list-item__badge">
                {query.is_published ? "Опубликован" : "Черновик"}
              </Badge>
            </div>
            <div className="profile-list-text muted">
              {[
                query.status && `Статус: ${STATUS_OPTIONS.find((o) => o.value === query.status)?.label || query.status}`,
                query.grant_info && `Грант: ${query.grant_info}`,
                query.budget && `Бюджет: ${query.budget}`,
                query.deadline && `Дедлайн: ${query.deadline}`,
                query.linked_task_solution && `Задача: ${query.linked_task_solution.title}`,
              ].filter(Boolean).join(" · ")}
            </div>
            {query.task_description && (
              <p className="profile-list-text" style={{ margin: 0 }} title={query.task_description}>
                {query.task_description.length > 140
                  ? `${query.task_description.slice(0, 140)}…`
                  : query.task_description}
              </p>
            )}
            {query.completed_examples && <p className="profile-list-text muted" style={{ margin: 0 }}>{query.completed_examples}</p>}
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
            {editingQueryId === query.id && queryEdit ? (
              <div className="profile-edit lab-form-grouped profile-form">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <Input
                    id={`query-edit-title-${query.id}`}
                    label="Название"
                    value={queryEdit.title}
                    onChange={(e) => setQueryEdit((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: Разработка аналитического метода"
                  />
                  <div className="ui-input-group">
                    <label htmlFor={`query-edit-task-${query.id}`}>Описание задачи</label>
                    <textarea
                      id={`query-edit-task-${query.id}`}
                      rows={3}
                      className="ui-input"
                      value={queryEdit.task_description}
                      onChange={(e) => setQueryEdit((prev) => ({ ...prev, task_description: e.target.value }))}
                      placeholder="Опишите задачу, проблему и ожидаемый результат"
                    />
                  </div>
                  <div className="ui-input-group">
                    <label htmlFor={`query-edit-examples-${query.id}`}>Примеры и кейсы</label>
                    <textarea
                      id={`query-edit-examples-${query.id}`}
                      rows={2}
                      className="ui-input"
                      value={queryEdit.completed_examples}
                      onChange={(e) => setQueryEdit((prev) => ({ ...prev, completed_examples: e.target.value }))}
                      placeholder="Пилотные проекты, внедрения, похожие решения"
                    />
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Бюджет, сроки и грант</div>
                  <Input
                    id={`query-edit-grant-${query.id}`}
                    label="Грант"
                    value={queryEdit.grant_info || ""}
                    onChange={(e) => setQueryEdit((prev) => ({ ...prev, grant_info: e.target.value }))}
                    placeholder="Название или номер гранта"
                  />
                  <Input
                    id={`query-edit-budget-${query.id}`}
                    label="Бюджет"
                    value={queryEdit.budget}
                    onChange={(e) => setQueryEdit((prev) => ({ ...prev, budget: e.target.value }))}
                    placeholder="Диапазон или сумма, руб."
                  />
                  <Input
                    id={`query-edit-deadline-${query.id}`}
                    label="Дедлайн"
                    value={queryEdit.deadline}
                    onChange={(e) => setQueryEdit((prev) => ({ ...prev, deadline: e.target.value }))}
                    placeholder="ДД.ММ.ГГГГ или квартал 2026"
                  />
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
                          <input type="checkbox" checked={(queryEdit.laboratory_ids || []).includes(lab.id)} onChange={() => toggleQueryLab(lab.id, true, query)} />
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
                  <Button variant="primary" onClick={updateQuery} loading={saving} disabled={saving}>
                    {saving ? "Сохранение…" : "Сохранить"}
                  </Button>
                  <Button variant="ghost" onClick={cancelEditQuery} disabled={saving}>Отмена</Button>
                  <Button variant="ghost" onClick={() => toggleQueryPublish(query.id, !query.is_published)} disabled={saving}>
                    {query.is_published ? "Снять с публикации" : "Опубликовать"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="dashboard-list-item__actions">
                <Button variant="primary" size="small" onClick={() => startEditQuery(query)} disabled={saving}>Редактировать</Button>
                <Button variant="ghost" size="small" className="lab-btn-delete" onClick={() => deleteQuery(query.id)} disabled={saving}>Удалить</Button>
                <Button variant="ghost" size="small" onClick={() => toggleQueryPublish(query.id, !query.is_published)} disabled={saving}>
                  {query.is_published ? "Снять с публикации" : "Опубликовать"}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div
        ref={newQueryRef}
        className={`profile-form-collapsible ${expandedNewQuery ? "expanded" : ""}`}
      >
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewQuery((prev) => !prev)} aria-expanded={expandedNewQuery}>
          Новый запрос
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped profile-form">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <Input
              id="query-draft-title"
              label="Название"
              value={queryDraft.title}
              onChange={(e) => setQueryDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Например: Разработка аналитического метода"
            />
            <div className="ui-input-group">
              <label htmlFor="query-draft-task">Описание задачи</label>
              <textarea
                id="query-draft-task"
                rows={3}
                className="ui-input"
                value={queryDraft.task_description}
                onChange={(e) => setQueryDraft((prev) => ({ ...prev, task_description: e.target.value }))}
                placeholder="Опишите задачу, проблему и ожидаемый результат"
              />
            </div>
            <div className="ui-input-group">
              <label htmlFor="query-draft-examples">Примеры и кейсы</label>
              <textarea
                id="query-draft-examples"
                rows={2}
                className="ui-input"
                value={queryDraft.completed_examples}
                onChange={(e) => setQueryDraft((prev) => ({ ...prev, completed_examples: e.target.value }))}
                placeholder="Пилотные проекты, внедрения, похожие решения"
              />
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Бюджет, сроки и грант</div>
            <Input
              id="query-draft-grant"
              label="Грант"
              value={queryDraft.grant_info}
              onChange={(e) => setQueryDraft((prev) => ({ ...prev, grant_info: e.target.value }))}
              placeholder="Название или номер гранта"
            />
            <Input
              id="query-draft-budget"
              label="Бюджет"
              value={queryDraft.budget}
              onChange={(e) => setQueryDraft((prev) => ({ ...prev, budget: e.target.value }))}
              placeholder="Диапазон или сумма, руб."
            />
            <Input
              id="query-draft-deadline"
              label="Дедлайн"
              value={queryDraft.deadline}
              onChange={(e) => setQueryDraft((prev) => ({ ...prev, deadline: e.target.value }))}
              placeholder="ДД.ММ.ГГГГ или квартал 2026"
            />
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
            <Button variant="primary" onClick={handleCreateQuery} loading={saving} disabled={saving}>
              {saving ? "Сохранение…" : "Создать запрос"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
