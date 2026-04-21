import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Paperclip, X } from "lucide-react";
import { apiRequest } from "../api/client";
import { useToast } from "../ToastContext";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function emptyForm() {
  return {
    subject: "",
    description: "",
    steps: "",
  };
}

export default function FeedbackWidget({ className = "nav-link feedback-nav-trigger", onOpen }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  useEffect(() => {
    if (!open) return undefined;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.setProperty("--feedback-scroll-y", String(scrollY));
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add("feedback-modal-open");
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("feedback-modal-open");
      document.body.style.removeProperty("--feedback-scroll-y");
      document.body.style.removeProperty("padding-right");
      document.removeEventListener("keydown", onKeyDown);
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const resetState = () => {
    setForm(emptyForm());
    setFiles([]);
    setError("");
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    resetState();
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateFiles = (nextFiles) => {
    if (nextFiles.length > MAX_FILES) {
      return `Можно прикрепить не более ${MAX_FILES} скриншотов`;
    }
    for (const file of nextFiles) {
      if (!file.type.startsWith("image/")) {
        return "Можно загружать только изображения";
      }
      if (file.size > MAX_FILE_SIZE) {
        return `Файл ${file.name} превышает 10 МБ`;
      }
    }
    return "";
  };

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const nextFiles = [...files, ...selected].slice(0, MAX_FILES + 1);
    const validationError = validateFiles(nextFiles);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }
    setFiles(nextFiles);
    setError("");
    event.target.value = "";
  };

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((file) => `${file.name}-${file.size}` !== name));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const subject = form.subject.trim();
    const description = form.description.trim();
    if (!subject || !description) {
      setError("Заполните тему и описание");
      return;
    }

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("description", description);
    formData.append("steps_to_reproduce", form.steps.trim());
    formData.append("current_url", window.location.href);
    formData.append("user_agent", navigator.userAgent || "");
    formData.append("viewport_width", String(window.innerWidth || ""));
    formData.append("viewport_height", String(window.innerHeight || ""));
    files.forEach((file) => {
      formData.append("screenshots", file);
    });

    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/feedback", {
        method: "POST",
        body: formData,
        skipAuth: false,
      });
      showToast("Спасибо, сообщение отправлено", "success");
      resetState();
      setOpen(false);
    } catch (e) {
      setError(e.message || "Не удалось отправить сообщение");
    } finally {
      setSubmitting(false);
    }
  };

  const openFeedback = () => {
    onOpen?.();
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={openFeedback}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>Сообщить о проблеме</span>
      </button>

      {portalTarget && open && createPortal(
        <div
          className="feedback-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          onClick={submitting ? undefined : close}
        >
          <div className="feedback-modal" onClick={(event) => event.stopPropagation()}>
            <div className="feedback-modal__header">
              <div>
                <p className="feedback-modal__eyebrow">Обратная связь</p>
                <h2 id="feedback-modal-title" className="feedback-modal__title">
                  Сообщить о проблеме
                </h2>
                <p className="feedback-modal__desc">
                  Опишите, что произошло, и при необходимости приложите скриншоты.
                </p>
              </div>
              <button
                type="button"
                className="feedback-modal__close"
                aria-label="Закрыть окно"
                onClick={close}
                disabled={submitting}
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <form className="feedback-modal__form" onSubmit={handleSubmit}>
              <Input
                id="feedback-subject"
                label="Тема"
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Например: не сохраняется профиль"
                maxLength={255}
              />

              <div className="ui-input-group">
                <label htmlFor="feedback-description">Описание</label>
                <textarea
                  id="feedback-description"
                  className="ui-input feedback-modal__textarea"
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Что пошло не так?"
                  rows={5}
                  required
                />
              </div>

              <div className="ui-input-group">
                <label htmlFor="feedback-steps">Что делали перед ошибкой</label>
                <textarea
                  id="feedback-steps"
                  className="ui-input feedback-modal__textarea"
                  value={form.steps}
                  onChange={(event) => updateField("steps", event.target.value)}
                  placeholder="Какие шаги привели к проблеме"
                  rows={4}
                />
              </div>

              <div className="feedback-modal__upload">
                <div className="feedback-modal__upload-header">
                  <span>Скриншоты</span>
                  <span className="feedback-modal__upload-hint">До {MAX_FILES} файлов по 10 МБ</span>
                </div>
                <label className="feedback-modal__upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={submitting || files.length >= MAX_FILES}
                  />
                  <Paperclip size={18} aria-hidden />
                  <span>Добавить изображения</span>
                </label>

                {files.length > 0 && (
                  <div className="feedback-modal__previews">
                    {previews.map(({ file, url }) => {
                      const key = `${file.name}-${file.size}`;
                      return (
                        <div key={key} className="feedback-modal__preview-card">
                          <img src={url} alt={file.name} className="feedback-modal__preview-image" />
                          <div className="feedback-modal__preview-meta">
                            <span className="feedback-modal__preview-name">{file.name}</span>
                            <button
                              type="button"
                              className="feedback-modal__preview-remove"
                              onClick={() => removeFile(key)}
                              aria-label={`Удалить ${file.name}`}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="feedback-modal__error" role="alert">
                  <AlertCircle size={16} aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <div className="feedback-modal__actions">
                <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Отправить
                </Button>
              </div>
            </form>
          </div>
        </div>,
        portalTarget
      )}
    </>
  );
}
