import React from "react";

export default function GalleryModal({
  gallery,
  galleryZoom,
  closeGallery,
  showPrev,
  showNext,
  handleGalleryWheel,
  toggleZoom,
}) {
  if (!gallery.open) return null;

  return (
    <div className="gallery-overlay" onClick={closeGallery}>
      <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gallery-close" onClick={closeGallery} aria-label="Закрыть">
          ×
        </button>
        <div className="gallery-body">
          <button className="gallery-nav" onClick={showPrev} aria-label="Предыдущее">
            ←
          </button>
          <div className="gallery-image-wrap" onWheel={handleGalleryWheel}>
            <img
              className="gallery-image"
              src={gallery.images[gallery.index]}
              alt="Галерея"
              style={{
                transform: `scale(${galleryZoom})`,
                cursor: galleryZoom > 1 ? "zoom-out" : "zoom-in",
              }}
              onClick={toggleZoom}
            />
          </div>
          <button className="gallery-nav" onClick={showNext} aria-label="Следующее">
            →
          </button>
        </div>
        <button className="gallery-zoom" onClick={toggleZoom}>
          {galleryZoom > 1 ? "Уменьшить" : "Увеличить"}
        </button>
        <div className="gallery-counter">
          {gallery.index + 1} / {gallery.images.length}
        </div>
      </div>
    </div>
  );
}
