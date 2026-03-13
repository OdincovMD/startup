import React, { useRef, useState } from "react";
import { normalizeWebsiteInput } from "../../../utils/validation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

/**
 * Модуль «Решённые задачи»: список, форма новой задачи, редактирование.
 * Стиль как у карточек лабораторий и оборудования.
 */
export default function TasksTab({
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
  const [expandedNewTask, setExpandedNewTask] = useState(false);
  const draftLinkInputRef = useRef(null);
  const editLinkInputRef = useRef(null);
  const newTaskRef = useRef(null);
  const listRef = useRef(null);

  const addArticleLink = (isEdit) => {
    if (isEdit && taskEdit) {
      const links = taskEdit.article_links || [];
      handleTaskEditChange("article_links", [...links, ""]);
    } else {
      setTaskDraft((prev) => ({ ...prev, article_links: [...(prev.article_links || []), ""] }));
    }
  };

  const removeArticleLink = (index, isEdit) => {
    if (isEdit && taskEdit) {
      const links = (taskEdit.article_links || []).filter((_, i) => i !== index);
      handleTaskEditChange("article_links", links);
    } else {
      setTaskDraft((prev) => ({
        ...prev,
        article_links: (prev.article_links || []).filter((_, i) => i !== index),
      }));
    }
  };

  const updateArticleLink = (index, value, isEdit) => {
    if (isEdit && taskEdit) {
      const links = [...(taskEdit.article_links || [])];
      links[index] = value;
      handleTaskEditChange("article_links", links);
    } else {
      setTaskDraft((prev) => {
        const links = [...(prev.article_links || [])];
        links[index] = value;
        return { ...prev, article_links: links };
      });
    }
  };

  const normalizeLinkAt = (index, isEdit) => {
    if (isEdit && taskEdit) {
      const links = taskEdit.article_links || [];
      const v = (links[index] || "").trim();
      if (!v) return;
      const normalized = normalizeWebsiteInput(v);
      if (normalized !== v) {
        const next = [...links];
        next[index] = normalized;
        handleTaskEditChange("article_links", next);
      }
    } else {
      setTaskDraft((prev) => {
        const links = [...(prev.article_links || [])];
        const v = (links[index] || "").trim();
        if (!v) return prev;
        const normalized = normalizeWebsiteInput(v);
        if (normalized === v) return prev;
        links[index] = normalized;
        return { ...prev, article_links: links };
      });
    }
  };

  const linksList = (task) => (task?.article_links || []).filter(Boolean);

  const handleAddTaskClick = () => {
    setExpandedNewTask(true);
    requestAnimationFrame(() => {
      if (newTaskRef.current) {
        newTaskRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleCreateTask = async () => {
    const ok = await createTask();
    if (ok) {
      setExpandedNewTask(false);
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
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>Решённые задачи</h2>
        <Button variant="primary" onClick={handleAddTaskClick}>
          + Добавить задачу
        </Button>
      </div>
      <p className="profile-section-desc">
        Добавляйте решённые задачи, указывайте сроки и грант, привязывайте к лабораториям.
      </p>
      <div className="profile-list" ref={listRef}>
        {orgTasks.length === 0 && (
          <div className="profile-empty-state">Задачи пока не добавлены.</div>
        )}
        {orgTasks.map((task) => (
          <Card key={task.id} variant="elevated" padding="md" className="dashboard-list-item">
            <div className="dashboard-list-item__title-row">
              <h4 className="dashboard-list-item__title">{task.title}</h4>
            </div>
            {(task.solution_deadline || task.grant_info || task.cost) && (
              <div className="profile-list-text muted">
                {[
                  task.solution_deadline && `Сроки: ${task.solution_deadline}`,
                  task.grant_info && `Грант: ${task.grant_info}`,
                  task.cost && `Стоимость: ${task.cost}`,
                ].filter(Boolean).join(" · ")}
              </div>
            )}
            {task.task_description && <p className="profile-list-text" style={{ margin: 0 }}>{task.task_description}</p>}
            {task.solution_description && <p className="profile-list-text" style={{ margin: 0 }}>{task.solution_description}</p>}
            {task.external_solutions && <p className="profile-list-text muted" style={{ margin: 0 }}>Альтернативы: {task.external_solutions}</p>}
              {linksList(task).length > 0 && (
                <div className="article-links-list">
                  {linksList(task).map((url, index) => (
                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="article-link-item">
                      {url.length > 60 ? url.slice(0, 57) + "…" : url}
                    </a>
                  ))}
                </div>
              )}
              {(task.laboratories || []).length > 0 && (
                <div className="chip-row">
                  {task.laboratories.map((lab) => (
                    <span key={lab.id} className="chip">{lab.name}</span>
                  ))}
                </div>
              )}
            {editingTaskId === task.id && taskEdit ? (
              <div className="profile-edit lab-form-grouped profile-form">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <div className="profile-form__row">
                    <Input id={`task-edit-title-${task.id}`} label="Название" value={taskEdit.title} onChange={(e) => handleTaskEditChange("title", e.target.value)} placeholder="Например: Разработка биосенсора" />
                  </div>
                  <div className="ui-input-group">
                    <label htmlFor={`task-edit-desc-${task.id}`}>Описание задачи</label>
                    <textarea id={`task-edit-desc-${task.id}`} rows={2} className="ui-input" value={taskEdit.task_description} onChange={(e) => handleTaskEditChange("task_description", e.target.value)} placeholder="Какая проблема решалась и для кого" />
                  </div>
                  <div className="ui-input-group">
                    <label htmlFor={`task-edit-solution-${task.id}`}>Решение и результат</label>
                    <textarea id={`task-edit-solution-${task.id}`} rows={2} className="ui-input" value={taskEdit.solution_description} onChange={(e) => handleTaskEditChange("solution_description", e.target.value)} placeholder="Описание решения и эффекта" />
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Ссылки на статьи</div>
                  <span className="profile-field-hint">Добавьте ссылку и нажмите Enter или кнопку «Добавить»</span>
                  {(taskEdit.article_links || []).map((url, index) => (
                    <div key={`link-${index}`} className="education-item">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateArticleLink(index, e.target.value, true)}
                        onBlur={() => normalizeLinkAt(index, true)}
                        placeholder="https://doi.org/... или URL статьи"
                        className="ui-input article-link-input"
                      />
                      <button type="button" className="file-remove" onClick={() => removeArticleLink(index, true)} aria-label="Удалить">×</button>
                    </div>
                  ))}
                  <div className="inline-form">
                    <input ref={editLinkInputRef} type="url" className="ui-input" placeholder="Вставьте ссылку" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArticleLink(true); e.currentTarget.value = ""; } }} style={{ flex: 1, minWidth: 0 }} />
                    <button type="button" className="ghost-btn" onClick={() => { addArticleLink(true); editLinkInputRef.current?.focus(); }}>Добавить ссылку</button>
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Сроки и грант</div>
                  <div className="profile-form__row">
                    <Input id={`task-edit-deadline-${task.id}`} label="Сроки решения" value={taskEdit.solution_deadline || ""} onChange={(e) => handleTaskEditChange("solution_deadline", e.target.value)} placeholder="Например: 2023–2024" />
                    <Input id={`task-edit-grant-${task.id}`} label="Грант" value={taskEdit.grant_info || ""} onChange={(e) => handleTaskEditChange("grant_info", e.target.value)} placeholder="Название или номер гранта" />
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Дополнительно</div>
                  <div className="profile-form__row">
                    <Input id={`task-edit-cost-${task.id}`} label="Стоимость" value={taskEdit.cost || ""} onChange={(e) => handleTaskEditChange("cost", e.target.value)} placeholder="Диапазон или модель стоимости" />
                  </div>
                  <div className="ui-input-group">
                    <label htmlFor={`task-edit-external-${task.id}`}>Альтернативы вне организации</label>
                    <textarea id={`task-edit-external-${task.id}`} rows={2} className="ui-input" value={taskEdit.external_solutions || ""} onChange={(e) => handleTaskEditChange("external_solutions", e.target.value)} placeholder="Внешние решения и отличия" />
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Лаборатории</div>
                  {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>}
                  {orgLabs.length > 0 && (
                    <div className="lab-employees-list">
                      {orgLabs.map((lab) => (
                        <label key={lab.id} className="lab-employee-chip">
                          <input type="checkbox" checked={(taskEdit.laboratory_ids || []).includes(lab.id)} onChange={() => toggleTaskLab(lab.id, true)} />
                          <span className="lab-employee-chip-name">{lab.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="lab-form-actions">
                  <Button variant="primary" onClick={updateTask} disabled={saving}>
                    {saving ? "Сохранение…" : "Сохранить"}
                  </Button>
                  <Button variant="ghost" onClick={cancelEditTask} disabled={saving}>Отмена</Button>
                </div>
              </div>
            ) : (
              <div className="dashboard-list-item__actions">
                <Button variant="primary" size="small" onClick={() => startEditTask(task)} disabled={saving}>
                  Редактировать
                </Button>
                <Button variant="ghost" size="small" onClick={() => deleteTask(task.id)} disabled={saving}>
                  Удалить
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div
        ref={newTaskRef}
        className={`profile-form-collapsible ${expandedNewTask ? "expanded" : ""}`}
      >
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewTask((prev) => !prev)} aria-expanded={expandedNewTask}>
          Новая решённая задача
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped profile-form">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <div className="profile-form__row">
              <Input id="task-draft-title" label="Название" value={taskDraft.title} onChange={(e) => setTaskDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Например: Разработка биосенсора" />
            </div>
            <div className="ui-input-group">
              <label htmlFor="task-draft-desc">Описание задачи</label>
              <textarea id="task-draft-desc" rows={2} className="ui-input" value={taskDraft.task_description} onChange={(e) => setTaskDraft((prev) => ({ ...prev, task_description: e.target.value }))} placeholder="Какая проблема решалась и для кого" />
            </div>
            <div className="ui-input-group">
              <label htmlFor="task-draft-solution">Решение и результат</label>
              <textarea id="task-draft-solution" rows={2} className="ui-input" value={taskDraft.solution_description} onChange={(e) => setTaskDraft((prev) => ({ ...prev, solution_description: e.target.value }))} placeholder="Описание решения и эффекта" />
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Ссылки на статьи</div>
            <span className="profile-field-hint">Добавьте ссылку и нажмите Enter или кнопку «Добавить»</span>
            {(taskDraft.article_links || []).map((url, index) => (
              <div key={`draft-link-${index}`} className="education-item">
                <input type="url" value={url} onChange={(e) => updateArticleLink(index, e.target.value, false)} onBlur={() => normalizeLinkAt(index, false)} placeholder="https://doi.org/... или URL" className="ui-input article-link-input" />
                <button type="button" className="file-remove" onClick={() => removeArticleLink(index, false)} aria-label="Удалить">×</button>
              </div>
            ))}
            <div className="inline-form">
              <input ref={draftLinkInputRef} type="url" className="ui-input" placeholder="Вставьте ссылку" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArticleLink(false); e.currentTarget.value = ""; } }} style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="ghost-btn" onClick={() => { addArticleLink(false); draftLinkInputRef.current?.focus(); }}>Добавить ссылку</button>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Сроки и грант</div>
            <div className="profile-form__row">
              <Input id="task-draft-deadline" label="Сроки решения" value={taskDraft.solution_deadline} onChange={(e) => setTaskDraft((prev) => ({ ...prev, solution_deadline: e.target.value }))} placeholder="Например: 2023–2024" />
              <Input id="task-draft-grant" label="Грант" value={taskDraft.grant_info} onChange={(e) => setTaskDraft((prev) => ({ ...prev, grant_info: e.target.value }))} placeholder="Название или номер гранта" />
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Дополнительно</div>
            <div className="profile-form__row">
              <Input id="task-draft-cost" label="Стоимость решения" value={taskDraft.cost} onChange={(e) => setTaskDraft((prev) => ({ ...prev, cost: e.target.value }))} placeholder="Диапазон или модель стоимости" />
            </div>
            <div className="ui-input-group">
              <label htmlFor="task-draft-external">Альтернативы вне организации</label>
              <textarea id="task-draft-external" rows={2} className="ui-input" value={taskDraft.external_solutions} onChange={(e) => setTaskDraft((prev) => ({ ...prev, external_solutions: e.target.value }))} placeholder="Внешние решения и отличия" />
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Лаборатории</div>
            {orgLabs.length === 0 && <p className="muted">Лабораторий пока нет — создайте в разделе «Лаборатории».</p>}
            {orgLabs.length > 0 && (
              <div className="lab-employees-list">
                {orgLabs.map((lab) => (
                  <label key={lab.id} className="lab-employee-chip">
                    <input type="checkbox" checked={(taskDraft.laboratory_ids || []).includes(lab.id)} onChange={() => toggleTaskLab(lab.id, false)} />
                    <span className="lab-employee-chip-name">{lab.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="lab-form-actions lab-form-actions--create">
            <Button variant="primary" onClick={handleCreateTask} disabled={saving}>
              {saving ? "Сохранение…" : "Создать задачу"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
