import React from "react";

export default function LabGalleryGrid({ images, onImageClick }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="lab-gallery-grid">
      {images.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          className="org-detail-card__media lab-gallery-item"
          onClick={() => onImageClick(index)}
        >
          <img src={url} alt="" />
        </button>
      ))}
    </div>
  );
}
