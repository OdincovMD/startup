import React, { useState } from "react";

/**
 * Общий модуль «Задачи» (решенные задачи): список задач (сверху, сворачиваемый), форма новой задачи.
 * Используется и представителем организации, и представителем лаборатории.
 */
export default function OrgTasksTab({
  taskDraft,
  setTaskDraft,
  orgLabs,
  toggleTaskLab,
  createTask,
  orgTasks,
  editingTaskId,
  taskEdit,
  handleTaskEditChange,
  updateTask,
  cancelEditTask,
  startEditTask,
  deleteTask,
  saving,
}) {
  const [expandedTasks, setExpandedTasks] = useState(true);
  const [expandedNewTask, setExpandedNewTask] = useState(false);

  return (
    <div className="profile-form">
      <div className={`profile-card-collapsible ${expandedTasks ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-card-header"
          onClick={() => setExpandedTasks((prev) => !prev)}
          aria-expanded={expandedTasks}
        >
          Решённые задачи ({orgTasks.length})
        </button>
        <div className="profile-card-body">
          <div className="profile-list">
            {orgTasks.length === 0 && <p className="muted">Задачи пока не добавлены.</p>}
            {orgTasks.map((task) => (
              <div key={task.id} className="profile-list-card">
                <div className="profile-list-content">
                  <div className="profile-list-title">{task.title}</div>
                  {task.task_description && <div className="profile-list-text">{task.task_description}</div>}
                  {task.solution_description && (
                    <div className="profile-list-text">{task.solution_description}</div>
                  )}
                  {task.completed_examples && (
                    <div className="profile-list-text">{task.completed_examples}</div>
                  )}
                  {(task.article_links || []).length > 0 && (
                    <div className="file-list">
                      {task.article_links.map((url, index) => (
                        <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="profile-list-meta">
                    {task.student_involvement && (
                      <span className="profile-list-text small muted">Студенты: {task.student_involvement}</span>
                    )}
                    {task.staff_involvement && (
                      <span className="profile-list-text small muted">Сотрудники: {task.staff_involvement}</span>
                    )}
                    {task.cost && (
                      <span className="profile-list-text small muted">Стоимость: {task.cost}</span>
                    )}
                  </div>
                  {task.external_solutions && (
                    <div className="profile-list-text small muted">Альтернативы: {task.external_solutions}</div>
                  )}
                  {(task.laboratories || []).length > 0 && (
                    <div className="chip-row">
                      {task.laboratories.map((lab) => (
                        <span key={lab.id} className="chip">
                          {lab.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {editingTaskId === task.id && taskEdit ? (
                  <div className="profile-edit">
                    <label>
                      Название
                      <input
                        value={taskEdit.title}
                        onChange={(e) => handleTaskEditChange("title", e.target.value)}
                        placeholder="Например: Разработка биосенсора для мониторинга"
                      />
                    </label>
                    <label>
                      Описание задачи
                      <textarea
                        rows={2}
                        value={taskEdit.task_description}
                        onChange={(e) => handleTaskEditChange("task_description", e.target.value)}
                        placeholder="Какая проблема решалась и для кого"
                      />
                    </label>
                    <label>
                      Решение и результат
                      <textarea
                        rows={2}
                        value={taskEdit.solution_description}
                        onChange={(e) => handleTaskEditChange("solution_description", e.target.value)}
                        placeholder="Описание решения и эффекта"
                      />
                    </label>
                    <label>
                      Примеры выполненных задач
                      <textarea
                        rows={2}
                        value={taskEdit.completed_examples}
                        onChange={(e) => handleTaskEditChange("completed_examples", e.target.value)}
                        placeholder="Пилотные проекты, внедрения, публикации"
                      />
                    </label>
                    <label>
                      Ссылки на статьи (по одной на строку)
                      <textarea
                        rows={2}
                        value={(taskEdit.article_links || []).join("\n")}
                        onChange={(e) =>
                          handleTaskEditChange(
                            "article_links",
                            e.target.value
                              .split("\n")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="https://doi.org/..."
                      />
                    </label>
                    <label>
                      Участие студентов
                      <textarea
                        rows={2}
                        value={taskEdit.student_involvement}
                        onChange={(e) => handleTaskEditChange("student_involvement", e.target.value)}
                        placeholder="Какие роли выполняли студенты"
                      />
                    </label>
                    <label>
                      Участие научных сотрудников
                      <textarea
                        rows={2}
                        value={taskEdit.staff_involvement}
                        onChange={(e) => handleTaskEditChange("staff_involvement", e.target.value)}
                        placeholder="Экспертиза, руководство, команды"
                      />
                    </label>
                    <label>
                      Стоимость
                      <input
                        value={taskEdit.cost}
                        onChange={(e) => handleTaskEditChange("cost", e.target.value)}
                        placeholder="Диапазон или модель стоимости"
                      />
                    </label>
                    <label>
                      Альтернативы вне организации
                      <textarea
                        rows={2}
                        value={taskEdit.external_solutions}
                        onChange={(e) => handleTaskEditChange("external_solutions", e.target.value)}
                        placeholder="Какие есть внешние решения и почему ваше лучше"
                      />
                    </label>
                    <div className="profile-form">
                      <div className="profile-label">Лаборатории</div>
                      {orgLabs.length === 0 && (
                        <p className="muted">Лабораторий пока нет — создайте первую.</p>
                      )}
                      {orgLabs.map((lab) => (
                        <label key={lab.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={(taskEdit.laboratory_ids || []).includes(lab.id)}
                            onChange={() => toggleTaskLab(lab.id, true)}
                          />
                          {lab.name}
                        </label>
                      ))}
                    </div>
                    <div className="profile-actions">
                      <button className="primary-btn" onClick={updateTask} disabled={saving}>
                        Сохранить
                      </button>
                      <button className="ghost-btn" onClick={cancelEditTask} disabled={saving}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-actions">
                    <button className="ghost-btn" onClick={() => startEditTask(task)} disabled={saving}>
                      Редактировать
                    </button>
                    <button className="ghost-btn" onClick={() => deleteTask(task.id)} disabled={saving}>
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`profile-form-collapsible ${expandedNewTask ? "expanded" : ""}`}>
        <button
          type="button"
          className="profile-form-collapsible-header"
          onClick={() => setExpandedNewTask((prev) => !prev)}
          aria-expanded={expandedNewTask}
        >
          Новая решённая задача
        </button>
        <div className="profile-form-collapsible-body">
      <label>
        Название
        <input
          value={taskDraft.title}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Например: Разработка биосенсора для мониторинга"
        />
      </label>
      <label>
        Описание задачи
        <textarea
          rows={3}
          value={taskDraft.task_description}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, task_description: e.target.value }))}
          placeholder="Какая проблема решалась и для кого"
        />
      </label>
      <label>
        Решение и результат
        <textarea
          rows={3}
          value={taskDraft.solution_description}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, solution_description: e.target.value }))}
          placeholder="Описание решения и эффекта"
        />
      </label>
      <label>
        Примеры выполненных задач
        <textarea
          rows={2}
          value={taskDraft.completed_examples}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, completed_examples: e.target.value }))}
          placeholder="Пилотные проекты, внедрения, публикации"
        />
      </label>
      <label>
        Ссылки на статьи (по одной на строку)
        <textarea
          rows={2}
          value={(taskDraft.article_links || []).join("\n")}
          onChange={(e) =>
            setTaskDraft((prev) => ({
              ...prev,
              article_links: e.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          placeholder="https://doi.org/..."
        />
      </label>
      <label>
        Участие студентов
        <textarea
          rows={2}
          value={taskDraft.student_involvement}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, student_involvement: e.target.value }))}
          placeholder="Какие роли выполняли студенты"
        />
      </label>
      <label>
        Участие научных сотрудников
        <textarea
          rows={2}
          value={taskDraft.staff_involvement}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, staff_involvement: e.target.value }))}
          placeholder="Экспертиза, руководство, команды"
        />
      </label>
      <label>
        Стоимость решения
        <input
          value={taskDraft.cost}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, cost: e.target.value }))}
          placeholder="Диапазон или модель стоимости"
        />
      </label>
      <label>
        Альтернативы вне организации
        <textarea
          rows={2}
          value={taskDraft.external_solutions}
          onChange={(e) => setTaskDraft((prev) => ({ ...prev, external_solutions: e.target.value }))}
          placeholder="Какие есть внешние решения и почему ваше лучше"
        />
      </label>
      <div className="profile-form">
        <div className="profile-label">Лаборатории</div>
        {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте первую.</p>}
        {orgLabs.map((lab) => (
          <label key={lab.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={(taskDraft.laboratory_ids || []).includes(lab.id)}
              onChange={() => toggleTaskLab(lab.id, false)}
            />
            {lab.name}
          </label>
        ))}
      </div>
      <button className="primary-btn" onClick={createTask} disabled={saving}>
        {saving ? "Сохраняем..." : "Добавить задачу"}
      </button>
        </div>
      </div>
    </div>
  );
}
