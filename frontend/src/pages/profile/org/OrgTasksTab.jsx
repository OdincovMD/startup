import React, { useRef, useState } from "react";
import { normalizeWebsiteInput } from "../../../utils/validation";

/**
 * Модуль «Решённые задачи»: список, форма новой задачи, редактирование.
 * Стиль как у карточек лабораторий и оборудования.
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
  const [expandedNewTask, setExpandedNewTask] = useState(false);
  const draftLinkInputRef = useRef(null);
  const editLinkInputRef = useRef(null);

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

  return (
    <div className="profile-form">
      <div className="lab-tab-header">
        <p className="lab-tab-desc">Добавляйте решённые задачи, указывайте сроки и грант, привязывайте к лабораториям.</p>
        <button type="button" className="primary-btn lab-btn-add" onClick={() => setExpandedNewTask(true)}>
          + Добавить задачу
        </button>
      </div>
      <div className="profile-list">
        {orgTasks.length === 0 && <p className="muted">Задачи пока не добавлены.</p>}
        {orgTasks.map((task) => (
          <div key={task.id} className="profile-list-card">
            <div className="profile-list-content">
              <div className="profile-list-title">{task.title}</div>
              {task.task_description && <div className="profile-list-text">{task.task_description}</div>}
              {task.solution_description && <div className="profile-list-text">{task.solution_description}</div>}
              {(task.solution_deadline || task.grant_info) && (
                <div className="profile-list-text small muted">
                  {task.solution_deadline && <span>Сроки: {task.solution_deadline}</span>}
                  {task.solution_deadline && task.grant_info && " · "}
                  {task.grant_info && <span>Грант: {task.grant_info}</span>}
                </div>
              )}
              {task.cost && <div className="profile-list-text small muted">Стоимость: {task.cost}</div>}
              {task.external_solutions && <div className="profile-list-text small muted">Альтернативы: {task.external_solutions}</div>}
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
            </div>
            {editingTaskId === task.id && taskEdit ? (
              <div className="profile-edit lab-form-grouped">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <label>Название <input value={taskEdit.title} onChange={(e) => handleTaskEditChange("title", e.target.value)} placeholder="Например: Разработка биосенсора" /></label>
                  <label>Описание задачи <textarea rows={2} value={taskEdit.task_description} onChange={(e) => handleTaskEditChange("task_description", e.target.value)} placeholder="Какая проблема решалась и для кого" /></label>
                  <label>Решение и результат <textarea rows={2} value={taskEdit.solution_description} onChange={(e) => handleTaskEditChange("solution_description", e.target.value)} placeholder="Описание решения и эффекта" /></label>
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
                        className="article-link-input"
                      />
                      <button type="button" className="file-remove" onClick={() => removeArticleLink(index, true)} aria-label="Удалить">×</button>
                    </div>
                  ))}
                  <div className="inline-form">
                    <input ref={editLinkInputRef} type="url" placeholder="Вставьте ссылку" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArticleLink(true); e.currentTarget.value = ""; } }} />
                    <button type="button" className="ghost-btn" onClick={() => { addArticleLink(true); editLinkInputRef.current?.focus(); }}>Добавить ссылку</button>
                  </div>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Сроки и грант</div>
                  <label>Сроки решения <input value={taskEdit.solution_deadline || ""} onChange={(e) => handleTaskEditChange("solution_deadline", e.target.value)} placeholder="Например: 2023–2024" /></label>
                  <label>Грант <input value={taskEdit.grant_info || ""} onChange={(e) => handleTaskEditChange("grant_info", e.target.value)} placeholder="Название или номер гранта" /></label>
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Дополнительно</div>
                  <label>Стоимость <input value={taskEdit.cost || ""} onChange={(e) => handleTaskEditChange("cost", e.target.value)} placeholder="Диапазон или модель стоимости" /></label>
                  <label>Альтернативы вне организации <textarea rows={2} value={taskEdit.external_solutions || ""} onChange={(e) => handleTaskEditChange("external_solutions", e.target.value)} placeholder="Внешние решения и отличия" /></label>
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
                  <button className="primary-btn lab-btn-save" onClick={updateTask} disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</button>
                  <button className="ghost-btn" onClick={cancelEditTask} disabled={saving}>Отмена</button>
                </div>
              </div>
            ) : (
              <div className="lab-card-actions">
                <button className="primary-btn lab-btn-edit" onClick={() => startEditTask(task)} disabled={saving}>Редактировать</button>
                <button className="ghost-btn lab-btn-delete" onClick={() => deleteTask(task.id)} disabled={saving}>Удалить</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`profile-form-collapsible ${expandedNewTask ? "expanded" : ""}`}>
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewTask((prev) => !prev)} aria-expanded={expandedNewTask}>
          Новая решённая задача
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <label>Название <input value={taskDraft.title} onChange={(e) => setTaskDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Например: Разработка биосенсора" /></label>
            <label>Описание задачи <textarea rows={2} value={taskDraft.task_description} onChange={(e) => setTaskDraft((prev) => ({ ...prev, task_description: e.target.value }))} placeholder="Какая проблема решалась и для кого" /></label>
            <label>Решение и результат <textarea rows={2} value={taskDraft.solution_description} onChange={(e) => setTaskDraft((prev) => ({ ...prev, solution_description: e.target.value }))} placeholder="Описание решения и эффекта" /></label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Ссылки на статьи</div>
            <span className="profile-field-hint">Добавьте ссылку и нажмите Enter или кнопку «Добавить»</span>
            {(taskDraft.article_links || []).map((url, index) => (
              <div key={`draft-link-${index}`} className="education-item">
                <input type="url" value={url} onChange={(e) => updateArticleLink(index, e.target.value, false)} onBlur={() => normalizeLinkAt(index, false)} placeholder="https://doi.org/... или URL" className="article-link-input" />
                <button type="button" className="file-remove" onClick={() => removeArticleLink(index, false)} aria-label="Удалить">×</button>
              </div>
            ))}
            <div className="inline-form">
              <input ref={draftLinkInputRef} type="url" placeholder="Вставьте ссылку" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArticleLink(false); e.currentTarget.value = ""; } }} />
              <button type="button" className="ghost-btn" onClick={() => { addArticleLink(false); draftLinkInputRef.current?.focus(); }}>Добавить ссылку</button>
            </div>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Сроки и грант</div>
            <label>Сроки решения <input value={taskDraft.solution_deadline} onChange={(e) => setTaskDraft((prev) => ({ ...prev, solution_deadline: e.target.value }))} placeholder="Например: 2023–2024" /></label>
            <label>Грант <input value={taskDraft.grant_info} onChange={(e) => setTaskDraft((prev) => ({ ...prev, grant_info: e.target.value }))} placeholder="Название или номер гранта" /></label>
          </div>
          <div className="profile-form-group">
            <div className="profile-form-group-title">Дополнительно</div>
            <label>Стоимость решения <input value={taskDraft.cost} onChange={(e) => setTaskDraft((prev) => ({ ...prev, cost: e.target.value }))} placeholder="Диапазон или модель стоимости" /></label>
            <label>Альтернативы вне организации <textarea rows={2} value={taskDraft.external_solutions} onChange={(e) => setTaskDraft((prev) => ({ ...prev, external_solutions: e.target.value }))} placeholder="Внешние решения и отличия" /></label>
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
            <button className="primary-btn lab-btn-save" onClick={createTask} disabled={saving}>{saving ? "Сохранение…" : "Создать задачу"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
