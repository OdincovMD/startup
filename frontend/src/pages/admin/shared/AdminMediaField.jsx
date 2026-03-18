import React from "react";
import { FileText, ImageIcon } from "lucide-react";
import { splitMedia, fileNameFromUrl } from "./utils";

/**
 * Медиа-поле как в профиле: загрузка файлов, превью изображений с удалением,
 * список документов (не изображений) с удалением.
 */
export default function AdminMediaField({
  urls = [],
  onChange,
  onUpload,
  uploading = false,
  disabled = false,
}) {
  const list = Array.isArray(urls) ? urls : (typeof urls === "string" && urls ? urls.split("\n").map((s) => s.trim()).filter(Boolean) : []);
  const { images, docs } = splitMedia(list);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files?.length || !onUpload) return;
    Promise.resolve(onUpload(files)).then((newUrls) => {
      if (newUrls?.length) onChange([...list, ...newUrls]);
    }).catch(() => {});
    e.target.value = "";
  };

  const removeUrl = (url) => {
    onChange(list.filter((u) => u !== url));
  };

  return (
    <div className="profile-form-group">
      <div className="profile-form-group-title">
        <ImageIcon size={16} /> Медиа
      </div>
      <input
        type="file"
        className="ui-input"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileChange}
        disabled={uploading || disabled}
      />
      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((url, idx) => (
            <div key={idx} className="image-preview">
              <img src={url} alt="" />
              <button
                type="button"
                className="image-remove"
                onClick={() => removeUrl(url)}
                aria-label="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="file-list" style={{ marginTop: "0.5rem" }}>
          {docs.map((url, idx) => (
            <div key={idx} className="file-link-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <a href={url} target="_blank" rel="noreferrer" className="file-link">
                <FileText size={14} />
                {fileNameFromUrl(url)}
              </a>
              <button
                type="button"
                className="image-remove"
                style={{ position: "static", width: "auto", height: "auto", padding: "0.2rem 0.4rem" }}
                onClick={() => removeUrl(url)}
                aria-label="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
