import React, { useRef, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const STUDENT_STATUS_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "Практика", label: "Практика" },
  { value: "Трудоустройство", label: "Трудоустройство" },
  { value: "Стажировка", label: "Стажировка" },
];

const fileNameFromUrl = (url) => {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "документ");
  } catch {
    return "документ";
  }
};

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
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag();
    }
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="tag-input-container">
      <div className="tag-input-tags">
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className="tag-input-tag">
            {tag}
            <button
              type="button"
              className="tag-input-tag-remove"
              onClick={() => removeTag(index)}
              aria-label={`Удалить ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          className="tag-input-field"
        />
      </div>
    </div>
  );
}

export default function StudentProfileSection({
  title = "Профиль студента",
  hideTitle = false,
  studentProfile,
  handleStudentChange,
  saveStudent,
  togglePublish,
  uploadStudentResume,
  uploadStudentDocument,
  removeStudentDocument,
  saving,
  uploading,
  onFileInputRefsReady,
}) {
  const educationInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [educationExpanded, setEducationExpanded] = useState(false);

  React.useEffect(() => {
    onFileInputRefsReady?.([resumeInputRef, documentInputRef]);
  }, [onFileInputRefsReady]);

  const p = studentProfile || {};

  const handleSave = () => {
    saveStudent();
  };

  return (
    <Card variant="solid" padding="lg" className="profile-section-card">
      {!hideTitle && (
        <h2 className="profile-section-card__title">{title}</h2>
      )}
      <p className="profile-section-desc">
        Информация о вас как о студенте
      </p>

      <div className="profile-form profile-form--grouped">
        <div className="profile-form-group">
          <div className="profile-form-group-title">
            Основная информация
            <span
              className={`org-detail-chip org-detail-chip--status ${p.is_published ? "org-detail-chip--published" : "org-detail-chip--draft"}`}
              style={{ marginLeft: "0.5rem" }}
              title={p.is_published ? "Профиль виден в разделе «Соискатели»" : "Черновик — видно только вам"}
            >
              {p.is_published ? "Опубликовано" : "Черновик"}
            </span>
          </div>
          <div className="profile-form-group-title">Статус</div>
          <div className="job-search-status-selector">
            {STUDENT_STATUS_OPTIONS.map((opt) => (
              <label key={opt.value || "empty"} className="job-search-option">
                <input
                  type="radio"
                  name="student_status"
                  value={opt.value}
                  checked={(p.status || "") === opt.value}
                  onChange={(e) => handleStudentChange("status", e.target.value || null)}
                />
                <span className="job-search-option-label">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="ui-input-group">
            <label htmlFor="student-summary">Описание</label>
            <textarea
              id="student-summary"
              rows={4}
              className="ui-input"
              value={p.summary || ""}
              onChange={(e) => handleStudentChange("summary", e.target.value)}
              placeholder="Расскажите о себе, опыте работы (если имеется), своих целях и интересах"
            />
          </div>
        </div>

        <div className="profile-form-group">
          <button
            type="button"
            className="collapsible-header"
            onClick={() => setEducationExpanded(!educationExpanded)}
            aria-expanded={educationExpanded}
          >
            <span>Образование ({(p.education || []).length})</span>
            <span className={`collapsible-arrow ${educationExpanded ? "expanded" : ""}`}>▼</span>
          </button>
          {educationExpanded && (
            <div className="collapsible-content">
              <div className="inline-form">
                <input
                  ref={educationInputRef}
                  placeholder="Университет, факультет, специальность, год выпуска"
                  className="education-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = e.currentTarget.value.trim();
                      if (v) {
                        handleStudentChange("education", [...(p.education || []), v]);
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    const v = educationInputRef.current?.value?.trim();
                    if (v) {
                      handleStudentChange("education", [...(p.education || []), v]);
                      educationInputRef.current.value = "";
                    }
                  }}
                >
                  Добавить
                </button>
              </div>
              <span className="profile-field-hint">Введите информацию об образовании и нажмите Enter или кнопку "Добавить"</span>
              {(p.education || []).length > 0 && (
                <div className="education-list">
                  {(p.education || []).map((item, index) => (
                    <div key={`edu-${index}`} className="education-item">
                      <span>{item}</span>
                      <button
                        type="button"
                        className="file-remove"
                        onClick={() =>
                          handleStudentChange(
                            "education",
                            (p.education || []).filter((_, i) => i !== index)
                          )
                        }
                        aria-label="Удалить"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="profile-form-group">
          <div className="profile-form-group-title">Компетенции</div>
          <div className="ui-input-group">
            <label htmlFor="skills-input">Навыки</label>
            <TagInput
              id="skills-input"
              value={p.skills || []}
              onChange={(skills) => handleStudentChange("skills", skills)}
              placeholder="Введите навык и нажмите запятую или Enter"
            />
            <span className="profile-field-hint">Python, SQL и т.д. — введите через запятую</span>
          </div>
          <div className="ui-input-group">
            <label htmlFor="interests-input">Научные интересы</label>
            <TagInput
              id="interests-input"
              value={p.research_interests || []}
              onChange={(interests) => handleStudentChange("research_interests", interests)}
              placeholder="Введите интерес и нажмите запятую или Enter"
            />
            <span className="profile-field-hint">Аналогично добавить</span>
          </div>
        </div>

        <div className="profile-form-group">
          <div className="profile-form-group-title">Резюме и документы</div>
          <div className="ui-input-group">
            <label htmlFor="student-resume">Резюме / CV</label>
            <input
              ref={resumeInputRef}
              id="student-resume"
              type="file"
              className="ui-input"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => uploadStudentResume?.(e.target.files?.[0])}
              disabled={uploading || saving}
            />
          </div>
          {p.resume_url && (
            <div className="file-item">
              <a href={p.resume_url} target="_blank" rel="noopener noreferrer">
                {fileNameFromUrl(p.resume_url)}
              </a>
              <button
                type="button"
                className="file-remove"
                onClick={() => handleStudentChange("resume_url", "")}
              >
                ×
              </button>
            </div>
          )}
          <div className="ui-input-group">
            <label htmlFor="student-docs">Дополнительные документы (сертификаты, грамоты и т.д.)</label>
            <input
              ref={documentInputRef}
              id="student-docs"
              type="file"
              className="ui-input"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => uploadStudentDocument?.(e.target.files?.[0])}
              disabled={uploading || saving}
            />
          </div>
          {(p.document_urls || []).map((url, index) => (
            <div key={`doc-${index}`} className="file-item">
              <a href={url} target="_blank" rel="noopener noreferrer">
                {fileNameFromUrl(url)}
              </a>
              <button
                type="button"
                className="file-remove"
                onClick={() => removeStudentDocument?.(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="profile-actions-wrap">
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
          {togglePublish && (
            <Button
              variant={p.is_published ? "secondary" : "ghost"}
              onClick={() => togglePublish()}
              disabled={saving}
            >
              {p.is_published ? "Снять с публикации" : "Опубликовать"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
