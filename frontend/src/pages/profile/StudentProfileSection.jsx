import React, { useRef, useState } from "react";

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
    <div className="profile-section profile-section--no-border">
      {!hideTitle && <h3 className="profile-section-title">{title}</h3>}
      <p className="profile-section-desc">Информация о вас как о студенте</p>

      <div className="profile-form profile-form--grouped">
        <div className="profile-form-group">
          <div className="profile-form-group-title">Основная информация</div>
          <label>
            Статус
            <input
              value={p.status || ""}
              onChange={(e) => handleStudentChange("status", e.target.value)}
              placeholder="Ищу практику/стажировку/вариант трудоустройства..."
            />
          </label>
          <label>
            Описание
            <textarea
              rows={4}
              value={p.summary || ""}
              onChange={(e) => handleStudentChange("summary", e.target.value)}
              placeholder="Расскажите о себе, опыте работы (если имеется), своих целях и интересах"
            />
          </label>
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
          <label htmlFor="skills-input">
            Навыки
            <TagInput
              id="skills-input"
              value={p.skills || []}
              onChange={(skills) => handleStudentChange("skills", skills)}
              placeholder="Введите навык и нажмите запятую или Enter"
            />
            <span className="profile-field-hint">Python, SQL и т.д. — введите через запятую</span>
          </label>
          <label htmlFor="interests-input">
            Научные интересы
            <TagInput
              id="interests-input"
              value={p.research_interests || []}
              onChange={(interests) => handleStudentChange("research_interests", interests)}
              placeholder="Введите интерес и нажмите запятую или Enter"
            />
            <span className="profile-field-hint">Аналогично добавить</span>
          </label>
        </div>

        <div className="profile-form-group">
          <div className="profile-form-group-title">Резюме и документы</div>
          <label>
            Резюме / CV
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => uploadStudentResume?.(e.target.files?.[0])}
              disabled={uploading || saving}
            />
          </label>
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
          <label>
            Дополнительные документы (сертификаты, грамоты и т.д.)
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => uploadStudentDocument?.(e.target.files?.[0])}
              disabled={uploading || saving}
            />
          </label>
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

        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
