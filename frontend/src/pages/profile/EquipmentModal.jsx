import React from "react";
import { X, Wrench, Info, FileText, Globe } from "lucide-react";
import { Badge } from "../../components/ui";

export default function EquipmentModal({
  equipment,
  onClose,
  openGallery,
}) {
  if (!equipment) return null;

  const images = Array.isArray(equipment.image_urls) ? equipment.image_urls.filter(url => url && url.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i)) : [];
  const docs = Array.isArray(equipment.image_urls) ? equipment.image_urls.filter(url => url && !url.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i)) : [];

  const fileNameFromUrl = (url) => {
    try {
      const withoutQuery = url.split("?")[0];
      const parts = withoutQuery.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return url;
    }
  };

  return (
    <div className="gallery-overlay" onClick={onClose}>
      <div className="employee-modal employee-modal--refined" onClick={(e) => e.stopPropagation()}>
        <button className="employee-modal__close" onClick={onClose} aria-label="Закрыть">
          <X size={20} />
        </button>

        <div className="employee-modal__header">
          <div className="employee-modal__avatar-section">
            <div className="employee-modal__avatar-container">
              {images[0] ? (
                <img
                  className="employee-modal__avatar"
                  src={images[0]}
                  alt={equipment.name}
                  onClick={() => openGallery(images, 0)}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div className="employee-modal__avatar-fallback">
                  <Wrench size={40} />
                </div>
              )}
            </div>
            <div className="employee-modal__title-group">
              <h2 className="employee-modal__name">{equipment.name}</h2>
              <p className="employee-modal__subtitle">Оборудование организации</p>
            </div>
          </div>
        </div>

        <div className="employee-modal__scroll-area">
          {equipment.characteristics && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <Info size={16} />
                <span>Характеристики</span>
              </div>
              <p className="employee-modal__subtitle" style={{ color: 'var(--text-primary-alt)' }}>
                {equipment.characteristics}
              </p>
            </div>
          )}

          {equipment.description && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <FileText size={16} />
                <span>Описание</span>
              </div>
              <p className="employee-modal__subtitle" style={{ color: 'var(--text-secondary)' }}>
                {equipment.description}
              </p>
            </div>
          )}

          {images.length > 1 && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <span>Дополнительные фото ({images.length - 1})</span>
              </div>
              <div className="image-preview-grid">
                {images.slice(1).map((url, idx) => (
                  <div key={idx} className="image-preview" onClick={() => openGallery(images, idx + 1)}>
                    <img src={url} alt="" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {docs.length > 0 && (
            <div className="employee-modal__section">
              <div className="employee-modal__section-header">
                <FileText size={16} />
                <span>Документы</span>
              </div>
              <div className="org-detail-card__files org-detail-card__files--block">
                {docs.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="applicant-detail-docs-link">
                    <FileText size={14} /> {fileNameFromUrl(url)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
