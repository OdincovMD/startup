import React from "react";

/**
 * Single main photo with optional "+N фото" overlay.
 * Click opens the existing gallery modal at index 0.
 */
export default function LabGalleryGrid({ images, onImageClick }) {
  if (!images || images.length === 0) return null;

  const mainImage = images[0];
  const extraCount = images.length - 1;
  const hasMore = extraCount > 0;

  return (
    <button
      type="button"
      className="lab-gallery-preview"
      onClick={() => onImageClick(0)}
    >
      <img src={mainImage} alt="" className="lab-gallery-preview__img" />
      {hasMore && (
        <span className="lab-gallery-preview__badge" aria-hidden="true">
          +{extraCount} фото
        </span>
      )}
    </button>
  );
}
