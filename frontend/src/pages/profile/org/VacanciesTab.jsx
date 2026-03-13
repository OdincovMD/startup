import React, { useState, useRef } from "react";
import { formatPhoneRU, normalizePhoneRU } from "../../../utils/validation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";

/**
 * Вкладка «Вакансии»: список вакансий, форма новой и редактирование.
 * Стиль как у запросов/лабораторий: lab-tab-header, profile-list, lab-card-actions, lab-form-grouped.
 * Связанный запрос и лаборатория — карточка выбранного + очистка или select.
 * Контакт: либо сотрудник (карточка + очистка/select), либо при отсутствии — обязательные email и телефон.
 */
const ERR_REMOVE_CONTACT =
  "Снимите вакансию с публикации, затем удалите контактное лицо.";
const ERR_REMOVE_LAB = "Снимите вакансию с публикации, затем удалите лабораторию.";

export default function VacanciesTab({
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
  onError,
}) {
  const [expandedNewVacancy, setExpandedNewVacancy] = useState(false);
  const newVacancyRef = useRef(null);
  const listRef = useRef(null);

  const handleAddVacancyClick = () => {
    setExpandedNewVacancy(true);
    requestAnimationFrame(() => {
      if (newVacancyRef.current) {
        newVacancyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleCreateVacancy = async () => {
    const ok = await createVacancy();
    if (ok) {
      setExpandedNewVacancy(false);
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  };

  const renderContactMeta = (vacancy) => {
    if (vacancy.contact_employee || vacancy.contact_employee_id) {
      const name = vacancy.contact_employee?.full_name || orgEmployees.find((e) => e.id === vacancy.contact_employee_id)?.full_name || "—";
      return <span className="profile-list-text small muted">Контакт: {name}</span>;
    }
    if (vacancy.contact_email || vacancy.contact_phone) {
      const phone = vacancy.contact_phone ? formatPhoneRU(vacancy.contact_phone) : "";
      return (
        <span className="profile-list-text small muted">
          Контакт: {[vacancy.contact_email, phone].filter(Boolean).join(" · ")}
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

  const renderLinkedLab = (laboratoryId, setState, isPublished = false) => {
    const selected = orgLabs.find((l) => l.id === laboratoryId);
    const handleClear = () => {
      if (isPublished && onError) {
        onError(ERR_REMOVE_LAB);
        return;
      }
      setState((prev) => ({ ...prev, laboratory_id: null }));
    };
    return (
      <div className="query-linked-task-block">
        {selected ? (
          <div className="query-linked-task-selected">
            <span className="query-linked-task-title">{selected.name}</span>
            <button type="button" className="query-linked-task-clear" onClick={handleClear} aria-label="Очистить">×</button>
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

  const renderContactBlock = (state, setState, isPublished = false, idPrefix = "vacancy-contact") => {
    const selectedEmp = state.contact_employee_id ? orgEmployees.find((e) => e.id === state.contact_employee_id) : null;
    const showEmailPhone = !state.contact_employee_id;
    const contactHasNoEmail =
      selectedEmp && !(selectedEmp.contacts?.email || selectedEmp.contacts?.mail);
    const handleClearContact = () => {
      if (isPublished && onError) {
        const hasFallback = ((state.contact_email || "").trim() && (state.contact_phone || "").trim());
        if (!hasFallback) {
          onError(ERR_REMOVE_CONTACT);
          return;
        }
      }
      setState((prev) => ({ ...prev, contact_employee_id: null, contact_email: prev.contact_email || "", contact_phone: prev.contact_phone || "" }));
    };
    return (
      <>
        <div className="query-linked-task-block">
          {selectedEmp ? (
            <>
              <div className="query-linked-task-selected">
                <span className="query-linked-task-title">{selectedEmp.full_name}</span>
                <button type="button" className="query-linked-task-clear" onClick={handleClearContact} aria-label="Очистить">×</button>
              </div>
              {contactHasNoEmail && (
                <p className="profile-field-hint profile-field-warning" role="alert">
                  У контактного лица не указан email. Для получения откликов будет использоваться email вашего личного аккаунта.
                </p>
              )}
            </>
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
            <Input
              id={`${idPrefix}-email`}
              label="Email для связи"
              type="email"
              value={state.contact_email || ""}
              onChange={(e) => setState((prev) => ({ ...prev, contact_email: e.target.value }))}
              placeholder="contact@example.com"
              autoComplete="email"
            />
            <Input
              id={`${idPrefix}-phone`}
              label="Телефон для связи"
              type="tel"
              value={state.contact_phone ? formatPhoneRU(state.contact_phone) : ""}
              onChange={(e) => {
                const digits = normalizePhoneRU(e.target.value);
                setState((prev) => ({ ...prev, contact_phone: digits ? `7${digits}` : "" }));
              }}
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              maxLength={18}
              hint="Формат: +7 (999) 123-45-67"
            />
          </div>
        )}
      </>
    );
  };

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      <div className="profile-section-header">
        <h2 className="profile-section-card__title" style={{ margin: 0 }}>Вакансии</h2>
        <Button variant="primary" onClick={handleAddVacancyClick}>
          + Добавить вакансию
        </Button>
      </div>
      <p className="profile-section-desc" style={{ marginBottom: "1.5rem" }}>
        Добавляйте вакансии, привязывайте к запросам и лабораториям. Укажите контактное лицо (сотрудника) или email и телефон для связи.
      </p>
      <div className="profile-list" ref={listRef}>
        {orgVacancies.length === 0 && (
          <div className="profile-empty-state">
            Вакансии пока не добавлены.
          </div>
        )}
        {orgVacancies.map((vacancy) => (
          <Card key={vacancy.id} variant="elevated" padding="md" className="dashboard-list-item">
            <div className="dashboard-list-item__title-row">
              <h4 className="dashboard-list-item__title">{vacancy.name}</h4>
              <Badge variant={vacancy.is_published ? "published" : "draft"} className="dashboard-list-item__badge">
                {vacancy.is_published ? "Опубликовано" : "Черновик"}
              </Badge>
            </div>
            <div className="profile-list-text muted">
              {[
                vacancy.employment_type,
                (vacancy.query || vacancy.query_id) && `Запрос: ${vacancy.query?.title || orgQueries.find((q) => q.id === vacancy.query_id)?.title || "—"}`,
                (vacancy.laboratory || vacancy.laboratory_id) && `Лаборатория: ${vacancy.laboratory?.name || orgLabs.find((l) => l.id === vacancy.laboratory_id)?.name || "—"}`,
              ].filter(Boolean).join(" · ")}
              {renderContactMeta(vacancy)}
            </div>
            {vacancy.requirements && <p className="profile-list-text" style={{ margin: 0 }}>{vacancy.requirements}</p>}
            {vacancy.description && <p className="profile-list-text" style={{ margin: 0 }}>{vacancy.description}</p>}
            {editingVacancyId === vacancy.id && vacancyEdit ? (
              <div className="profile-edit lab-form-grouped profile-form">
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Основная информация</div>
                  <Input
                    id={`vacancy-edit-name-${vacancy.id}`}
                    label="Название"
                    value={vacancyEdit.name}
                    onChange={(e) => setVacancyEdit((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Например: Исследователь, Постдок"
                  />
                  <div className="ui-input-group">
                    <label htmlFor={`vacancy-edit-requirements-${vacancy.id}`}>Требования</label>
                    <textarea
                      id={`vacancy-edit-requirements-${vacancy.id}`}
                      rows={2}
                      className="ui-input"
                      value={vacancyEdit.requirements}
                      onChange={(e) => setVacancyEdit((prev) => ({ ...prev, requirements: e.target.value }))}
                      placeholder="Образование, опыт, навыки"
                    />
                  </div>
                  <div className="ui-input-group">
                    <label htmlFor={`vacancy-edit-description-${vacancy.id}`}>Описание</label>
                    <textarea
                      id={`vacancy-edit-description-${vacancy.id}`}
                      rows={2}
                      className="ui-input"
                      value={vacancyEdit.description}
                      onChange={(e) => setVacancyEdit((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Обязанности, условия работы"
                    />
                  </div>
                  <Input
                    id={`vacancy-edit-employment-${vacancy.id}`}
                    label="Тип занятости"
                    value={vacancyEdit.employment_type || ""}
                    onChange={(e) => setVacancyEdit((prev) => ({ ...prev, employment_type: e.target.value }))}
                    placeholder="Полная занятость, стажировка"
                  />
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Связанный запрос</div>
                  <p className="profile-field-hint query-linked-hint">Опционально: привязка к запросу на R&D.</p>
                  {renderLinkedQuery(vacancyEdit.query_id, setVacancyEdit)}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Лаборатория</div>
                  <p className="profile-field-hint query-linked-hint">Лаборатория, в которой открыта вакансия.</p>
                  {renderLinkedLab(vacancyEdit.laboratory_id, setVacancyEdit, vacancy.is_published)}
                </div>
                <div className="profile-form-group">
                  <div className="profile-form-group-title">Контакт для связи</div>
                  {renderContactBlock(vacancyEdit, setVacancyEdit, vacancy.is_published, `vacancy-edit-${vacancy.id}-contact`)}
                </div>
                <div className="lab-form-actions">
                  <Button variant="primary" onClick={updateVacancy} loading={saving} disabled={saving}>
                    {saving ? "Сохранение…" : "Сохранить"}
                  </Button>
                  <Button variant="ghost" onClick={cancelEditVacancy} disabled={saving}>Отмена</Button>
                  <Button variant="ghost" onClick={() => toggleVacancyPublish(vacancy.id, !vacancy.is_published)} disabled={saving}>
                    {vacancy.is_published ? "Снять с публикации" : "Опубликовать"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="dashboard-list-item__actions">
                <Button variant="primary" size="small" onClick={() => startEditVacancy(vacancy)} disabled={saving}>Редактировать</Button>
                <Button variant="ghost" size="small" className="lab-btn-delete" onClick={() => deleteVacancy(vacancy.id)} disabled={saving}>Удалить</Button>
                <Button variant="ghost" size="small" onClick={() => toggleVacancyPublish(vacancy.id, !vacancy.is_published)} disabled={saving}>
                  {vacancy.is_published ? "Снять с публикации" : "Опубликовать"}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div
        ref={newVacancyRef}
        className={`profile-form-collapsible ${expandedNewVacancy ? "expanded" : ""}`}
      >
        <button type="button" className="profile-form-collapsible-header" onClick={() => setExpandedNewVacancy((prev) => !prev)} aria-expanded={expandedNewVacancy}>
          Новая вакансия
        </button>
        <div className="profile-form-collapsible-body lab-form-grouped profile-form">
          <div className="profile-form-group">
            <div className="profile-form-group-title">Основная информация</div>
            <Input
              id="vacancy-draft-name"
              label="Название"
              value={vacancyDraft.name}
              onChange={(e) => setVacancyDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Например: Исследователь, Постдок"
            />
            <div className="ui-input-group">
              <label htmlFor="vacancy-draft-requirements">Требования</label>
              <textarea
                id="vacancy-draft-requirements"
                rows={2}
                className="ui-input"
                value={vacancyDraft.requirements}
                onChange={(e) => setVacancyDraft((prev) => ({ ...prev, requirements: e.target.value }))}
                placeholder="Образование, опыт, навыки"
              />
            </div>
            <div className="ui-input-group">
              <label htmlFor="vacancy-draft-description">Описание</label>
              <textarea
                id="vacancy-draft-description"
                rows={2}
                className="ui-input"
                value={vacancyDraft.description}
                onChange={(e) => setVacancyDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Обязанности, условия работы"
              />
            </div>
            <Input
              id="vacancy-draft-employment"
              label="Тип занятости"
              value={vacancyDraft.employment_type || ""}
              onChange={(e) => setVacancyDraft((prev) => ({ ...prev, employment_type: e.target.value }))}
              placeholder="Полная занятость, стажировка"
            />
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
            {renderContactBlock(vacancyDraft, setVacancyDraft, false, "vacancy-draft-contact")}
          </div>
          <div className="lab-form-actions lab-form-actions--create">
            <Button variant="primary" onClick={handleCreateVacancy} loading={saving} disabled={saving}>
              {saving ? "Сохранение…" : "Создать вакансию"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
