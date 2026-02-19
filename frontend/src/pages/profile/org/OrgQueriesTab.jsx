import React, { useState } from "react";

const STATUS_LABELS = {
  active: "Активный",
  paused: "На паузе",
  closed: "Закрыт",
};

/**
 * Общий модуль «Запросы»: список запросов (сверху, сворачиваемый), форма нового запроса.
 * Используется и представителем организации, и представителем лаборатории.
 */
export default function OrgQueriesTab({
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
  const [expandedQueries, setExpandedQueries] = useState(true);
  const [expandedNewQuery, setExpandedNewQuery] = useState(false);

  return (
    <div className="profile-form">
      <div className={`profile-card-collapsible ${expandedQueries ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-card-header"
          onClick={() => setExpandedQueries((prev) => !prev)}
          aria-expanded={expandedQueries}
        >
          Запросы ({orgQueries.length})
        </button>
        <div className="profile-card-body">
          <div className="profile-list">
            {orgQueries.length === 0 && <p className="muted">Запросы пока не добавлены.</p>}
            {orgQueries.map((query) => (
              <div key={query.id} className="profile-list-card">
                <div className="profile-list-content">
                  <div className="profile-list-title">{query.title}</div>
                  <div className="profile-list-text small muted">
                    {query.is_published ? "Опубликовано" : "Черновик (видно только вам)"}
                  </div>
                  {query.task_description && (
                    <div className="profile-list-text">{query.task_description}</div>
                  )}
                  {query.completed_examples && (
                    <div className="profile-list-text">{query.completed_examples}</div>
                  )}
                  {(query.article_links || []).length > 0 && (
                    <div className="file-list">
                      {query.article_links.map((url, index) => (
                        <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="profile-list-meta">
                    {query.budget && (
                      <span className="profile-list-text small muted">Бюджет: {query.budget}</span>
                    )}
                    {query.deadline && (
                      <span className="profile-list-text small muted">Дедлайн: {query.deadline}</span>
                    )}
                    {query.status && (
                      <span className="profile-list-text small muted">
                        Статус: {STATUS_LABELS[query.status] || query.status}
                      </span>
                    )}
                  </div>
                  {query.linked_task_solution && (
                    <div className="profile-list-text small muted">
                      Решенная задача: {query.linked_task_solution.title}
                    </div>
                  )}
                  {(query.laboratories || []).length > 0 && (
                    <div className="chip-row">
                      {query.laboratories.map((lab) => (
                        <span key={lab.id} className="chip">
                          {lab.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {(query.employees || []).length > 0 && (
                    <div className="chip-row">
                      {query.employees.map((employee) => (
                        <span key={employee.id} className="chip">
                          {employee.full_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {(query.vacancies || []).length > 0 && (
                    <div className="chip-row">
                      {query.vacancies.map((vacancy) => (
                        <span key={vacancy.id} className="chip">
                          {vacancy.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {editingQueryId === query.id && queryEdit ? (
                  <div className="profile-edit">
                    <label>
                      Название
                      <input
                        value={queryEdit.title}
                        onChange={(e) => setQueryEdit((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Например: Разработка аналитического метода"
                      />
                    </label>
                    <label>
                      Описание задачи
                      <textarea
                        rows={3}
                        value={queryEdit.task_description}
                        onChange={(e) =>
                          setQueryEdit((prev) => ({ ...prev, task_description: e.target.value }))
                        }
                        placeholder="Опишите задачу, проблему и ожидаемый результат"
                      />
                    </label>
                    <label>
                      Примеры и кейсы
                      <textarea
                        rows={2}
                        value={queryEdit.completed_examples}
                        onChange={(e) =>
                          setQueryEdit((prev) => ({ ...prev, completed_examples: e.target.value }))
                        }
                        placeholder="Пилотные проекты, внедрения, похожие решения"
                      />
                    </label>
                    <label>
                      Ссылки на статьи (по одной на строку)
                      <textarea
                        rows={2}
                        value={(queryEdit.article_links || []).join("\n")}
                        onChange={(e) =>
                          setQueryEdit((prev) => ({
                            ...prev,
                            article_links: e.target.value
                              .split("\n")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          }))
                        }
                        placeholder="https://doi.org/..."
                      />
                      <span className="profile-field-hint">Каждая ссылка — с новой строки</span>
                    </label>
                    <label>
                      Бюджет
                      <input
                        value={queryEdit.budget}
                        onChange={(e) => setQueryEdit((prev) => ({ ...prev, budget: e.target.value }))}
                        placeholder="Диапазон или сумма, руб."
                      />
                    </label>
                    <label>
                      Дедлайн
                      <input
                        value={queryEdit.deadline}
                        onChange={(e) => setQueryEdit((prev) => ({ ...prev, deadline: e.target.value }))}
                        placeholder="ДД.ММ.ГГГГ или квартал 2026"
                      />
                    </label>
                    <label>
                      Статус
                      <select
                        value={queryEdit.status || "active"}
                        onChange={(e) => setQueryEdit((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="active">Активный</option>
                        <option value="paused">На паузе</option>
                        <option value="closed">Закрыт</option>
                      </select>
                    </label>
                    <label>
                      Связанная решенная задача
                      <select
                        value={queryEdit.linked_task_solution_id || ""}
                        onChange={(e) =>
                          setQueryEdit((prev) => ({
                            ...prev,
                            linked_task_solution_id: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                      >
                        <option value="">—</option>
                        {orgTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                      <span className="profile-field-hint">Опционально: привязка к выполненной задаче</span>
                    </label>
                    <div className="profile-form">
                      <div className="profile-label">Лаборатории</div>
                      {orgLabs.length === 0 && (
                        <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>
                      )}
                      {orgLabs.map((lab) => (
                        <label key={lab.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={(queryEdit.laboratory_ids || []).includes(lab.id)}
                            onChange={() => toggleQueryLab(lab.id, true)}
                          />
                          {lab.name}
                        </label>
                      ))}
                    </div>
                    <div className="profile-form">
                      <div className="profile-label">Ответственные сотрудники</div>
                      {orgEmployees.length === 0 && (
                        <p className="muted">Сотрудников пока нет — добавьте в разделе «Сотрудники».</p>
                      )}
                      {orgEmployees.map((employee) => (
                        <label key={employee.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={(queryEdit.employee_ids || []).includes(employee.id)}
                            onChange={() => toggleQueryEmployee(employee.id, true)}
                          />
                          {employee.full_name}
                        </label>
                      ))}
                    </div>
                    <div className="profile-actions">
                      <button className="primary-btn" onClick={updateQuery} disabled={saving}>
                        Сохранить
                      </button>
                      <button className="ghost-btn" onClick={cancelEditQuery} disabled={saving}>
                        Отмена
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => toggleQueryPublish(query.id, !query.is_published)}
                        disabled={saving}
                      >
                        {query.is_published ? "Снять с публикации" : "Опубликовать"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-actions">
                    <button className="ghost-btn" onClick={() => startEditQuery(query)} disabled={saving}>
                      Редактировать
                    </button>
                    <button className="ghost-btn" onClick={() => deleteQuery(query.id)} disabled={saving}>
                      Удалить
                    </button>
                    <button
                      className="ghost-btn"
                      onClick={() => toggleQueryPublish(query.id, !query.is_published)}
                      disabled={saving}
                    >
                      {query.is_published ? "Снять с публикации" : "Опубликовать"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`profile-form-collapsible ${expandedNewQuery ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewQuery((prev) => !prev)}
          aria-expanded={expandedNewQuery}
        >
          Новый запрос
        </button>
        <div className="profile-form-collapsible-body">
      <label>
        Название
        <input
          value={queryDraft.title}
          onChange={(e) => setQueryDraft((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Например: Разработка аналитического метода"
        />
      </label>
      <label>
        Описание задачи
        <textarea
          rows={3}
          value={queryDraft.task_description}
          onChange={(e) => setQueryDraft((prev) => ({ ...prev, task_description: e.target.value }))}
          placeholder="Опишите задачу, проблему и ожидаемый результат"
        />
      </label>
      <label>
        Примеры и кейсы
        <textarea
          rows={2}
          value={queryDraft.completed_examples}
          onChange={(e) => setQueryDraft((prev) => ({ ...prev, completed_examples: e.target.value }))}
          placeholder="Пилотные проекты, внедрения, похожие решения"
        />
      </label>
      <label>
        Ссылки на статьи (по одной на строку)
        <textarea
          rows={2}
          value={(queryDraft.article_links || []).join("\n")}
          onChange={(e) =>
            setQueryDraft((prev) => ({
              ...prev,
              article_links: e.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          placeholder="https://doi.org/..."
        />
        <span className="profile-field-hint">Каждая ссылка — с новой строки</span>
      </label>
      <label>
        Бюджет
        <input
          value={queryDraft.budget}
          onChange={(e) => setQueryDraft((prev) => ({ ...prev, budget: e.target.value }))}
          placeholder="Диапазон или сумма, руб."
        />
      </label>
      <label>
        Дедлайн
        <input
          value={queryDraft.deadline}
          onChange={(e) => setQueryDraft((prev) => ({ ...prev, deadline: e.target.value }))}
          placeholder="ДД.ММ.ГГГГ или квартал 2026"
        />
      </label>
      <label>
        Статус
        <select
          value={queryDraft.status || "active"}
          onChange={(e) => setQueryDraft((prev) => ({ ...prev, status: e.target.value }))}
        >
          <option value="active">Активный</option>
          <option value="paused">На паузе</option>
          <option value="closed">Закрыт</option>
        </select>
      </label>
      <label>
        Связанная решенная задача
        <select
          value={queryDraft.linked_task_solution_id || ""}
          onChange={(e) =>
            setQueryDraft((prev) => ({
              ...prev,
              linked_task_solution_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">—</option>
          {orgTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        <span className="profile-field-hint">Опционально: привязка к выполненной задаче</span>
      </label>
      <div className="profile-form">
        <div className="profile-label">Лаборатории</div>
        {orgLabs.length === 0 && (
          <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>
        )}
        {orgLabs.map((lab) => (
          <label key={lab.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={(queryDraft.laboratory_ids || []).includes(lab.id)}
              onChange={() => toggleQueryLab(lab.id, false)}
            />
            {lab.name}
          </label>
        ))}
      </div>
      <div className="profile-form">
        <div className="profile-label">Ответственные сотрудники</div>
        {orgEmployees.length === 0 && (
          <p className="muted">Сотрудников пока нет — добавьте в разделе «Сотрудники».</p>
        )}
        {orgEmployees.map((employee) => (
          <label key={employee.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={(queryDraft.employee_ids || []).includes(employee.id)}
              onChange={() => toggleQueryEmployee(employee.id, false)}
            />
            {employee.full_name}
          </label>
        ))}
      </div>
      <button className="primary-btn" onClick={createQuery} disabled={saving}>
        {saving ? "Сохраняем..." : "Добавить запрос"}
      </button>
        </div>
      </div>
    </div>
  );
}
