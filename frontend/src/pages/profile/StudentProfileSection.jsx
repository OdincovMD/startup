import React, { useRef, useState } from "react";
import { isValidEmail, formatPhoneRU } from "../../utils/validation";

const fileNameFromUrl = (url) => {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "документ");
  } catch {
    return "документ";
  }
};

export default function StudentProfileSection({
  title = "Профиль студента",
  hideTitle = false,
  studentProfile,
  handleStudentChange,
  saveStudent,
  uploadStudentPhoto,
  uploadStudentResume,
  uploadStudentDocument,
  removeStudentDocument,
  researchInterestOptions,
  saving,
  uploading,
  onFileInputRefsReady,
}) {
  const educationInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const documentInputRef = useRef(null);

  React.useEffect(() => {
    onFileInputRefsReady?.([photoInputRef, resumeInputRef, documentInputRef]);
  }, [onFileInputRefsReady]);
  const [emailError, setEmailError] = useState(null);

  const parseList = (raw) =>
    (raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const p = studentProfile || {};
  const contacts = p.contacts || {};

  const handleEmailChange = (value) => {
    handleStudentChange("contacts", { ...contacts, email: value });
    setEmailError(null);
  };

  const handleEmailBlur = () => {
    const email = (contacts.email || "").trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Введите корректный email");
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (value) => {
    handleStudentChange("contacts", { ...contacts, phone: formatPhoneRU(value) });
  };

  const handleSave = () => {
    const email = (contacts.email || "").trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Введите корректный email");
      return;
    }
    setEmailError(null);
    saveStudent();
  };

  return (
    <div className="profile-section">
      {!hideTitle && <h3 className="profile-section-title">{title}</h3>}
      <p className="profile-section-desc">Информация о вас как о студенте</p>
      <div className="profile-form">
        <label>
          Фото
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => uploadStudentPhoto?.(e.target.files?.[0])}
            disabled={uploading || saving}
          />
        </label>
        {p.photo_url && (
          <div className="employee-photo">
            <img src={p.photo_url} alt="Фото" />
            <button
              className="file-remove"
              onClick={() => handleStudentChange("photo_url", "")}
            >
              ×
            </button>
          </div>
        )}

        <label>
          Университет
          <input
            value={p.university || ""}
            onChange={(e) => handleStudentChange("university", e.target.value)}
            placeholder="МГТУ, МФТИ и т.д."
          />
        </label>
        <label>
          Уровень
          <input
            value={p.level || ""}
            onChange={(e) => handleStudentChange("level", e.target.value)}
            placeholder="Бакалавр, магистр"
          />
        </label>
        <label>
          Направление
          <input
            value={p.direction || ""}
            onChange={(e) => handleStudentChange("direction", e.target.value)}
            placeholder="Биоинформатика"
          />
        </label>
        <label>
          Статус
          <input
            value={p.status || ""}
            onChange={(e) => handleStudentChange("status", e.target.value)}
            placeholder="Ищу стажировку"
          />
        </label>
        <label>
          Навыки (через запятую)
          <input
            value={(p.skills || []).join(", ")}
            onChange={(e) =>
              handleStudentChange(
                "skills",
                parseList(e.target.value)
              )
            }
            placeholder="Python, ML, SQL"
          />
          <span className="profile-field-hint">Перечислите навыки через запятую</span>
        </label>
        <label>
          Описание
          <textarea
            rows={4}
            value={p.summary || ""}
            onChange={(e) => handleStudentChange("summary", e.target.value)}
            placeholder="Краткий профиль"
          />
        </label>

        <label>
          Научные интересы (через запятую)
          <input
            value={(p.research_interests || []).join(", ")}
            onChange={(e) =>
              handleStudentChange("research_interests", parseList(e.target.value))
            }
            list="student-interests"
            placeholder="Материаловедение, биоинформатика"
          />
          <span className="profile-field-hint">Перечислите через запятую или выберите из кнопок ниже</span>
        </label>
        <datalist id="student-interests">
          {researchInterestOptions?.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {researchInterestOptions?.length > 0 && (
          <div className="interest-options">
            {researchInterestOptions.map((item) => (
              <button
                key={item}
                type="button"
                className="ghost-btn"
                onClick={() => {
                  const current = p.research_interests || [];
                  const next = current.includes(item)
                    ? current.filter((x) => x !== item)
                    : [...current, item];
                  handleStudentChange("research_interests", next);
                }}
              >
                + {item}
              </button>
            ))}
          </div>
        )}

        <div className="profile-form">
          <div className="profile-label">Образование</div>
          <div className="inline-form">
            <input
              ref={educationInputRef}
              placeholder="Университет, факультет, год"
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
          {(p.education || []).map((item, index) => (
            <div key={`edu-${index}`} className="file-item">
              <span>{item}</span>
              <button
                className="file-remove"
                onClick={() =>
                  handleStudentChange(
                    "education",
                    (p.education || []).filter((_, i) => i !== index)
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="profile-form">
          <div className="profile-label">Контакты</div>
          <label>
            Email
            <input
              type="email"
              value={contacts.email || ""}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="email@example.com"
              autoComplete="email"
              className={emailError ? "error" : ""}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "student-email-error" : undefined}
            />
            {emailError && (
              <span id="student-email-error" className="profile-field-error">
                {emailError}
              </span>
            )}
          </label>
          <label>
            Телефон
            <input
              type="tel"
              value={contacts.phone ? formatPhoneRU(contacts.phone) : ""}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              maxLength={18}
            />
            <span className="profile-field-hint">Формат: +7 (999) 123-45-67</span>
          </label>
          <label>
            Telegram
            <input
              value={contacts.telegram || ""}
              onChange={(e) =>
                handleStudentChange("contacts", {
                  ...contacts,
                  telegram: e.target.value,
                })
              }
              placeholder="@username"
            />
          </label>
        </div>

        <h4>Резюме и документы</h4>
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
              className="file-remove"
              onClick={() => removeStudentDocument?.(index)}
            >
              ×
            </button>
          </div>
        ))}

        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
