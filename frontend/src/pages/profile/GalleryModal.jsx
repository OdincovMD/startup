import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export default function GalleryModal({
  gallery,
  galleryZoom,
  closeGallery,
  showPrev,
  showNext,
  handleGalleryWheel,
  toggleZoom,
}) {
  useEffect(() => {
    if (!gallery.open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gallery.open, closeGallery, showPrev, showNext]);

  if (!gallery.open) return null;

  return (
    <div className="gallery-overlay gallery-overlay--viewer" onClick={closeGallery}>
      <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="gallery-modal__close"
          onClick={closeGallery}
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>

        <div className="gallery-modal__body">
          <button
            className="gallery-modal__nav gallery-modal__nav--prev"
            onClick={showPrev}
            aria-label="Предыдущее изображение"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="gallery-modal__image-wrap" onWheel={handleGalleryWheel}>
            <img
              className="gallery-modal__image"
              src={gallery.images[gallery.index]}
              alt={`Изображение ${gallery.index + 1} из ${gallery.images.length}`}
              style={{
                transform: `scale(${galleryZoom})`,
                cursor: galleryZoom > 1 ? "zoom-out" : "zoom-in",
              }}
              onClick={toggleZoom}
              draggable={false}
            />
          </div>

          <button
            className="gallery-modal__nav gallery-modal__nav--next"
            onClick={showNext}
            aria-label="Следующее изображение"
          >
            <ChevronRight size={28} />
          </button>
        </div>

        <div className="gallery-modal__footer">
          <button
            className="gallery-modal__zoom-btn"
            onClick={toggleZoom}
            aria-label={galleryZoom > 1 ? "Уменьшить" : "Увеличить"}
          >
            {galleryZoom > 1 ? (
              <ZoomOut size={18} strokeWidth={2} />
            ) : (
              <ZoomIn size={18} strokeWidth={2} />
            )}
            <span>{galleryZoom > 1 ? "Уменьшить" : "Увеличить"}</span>
          </button>
          <span className="gallery-modal__counter" aria-live="polite">
            {gallery.index + 1} / {gallery.images.length}
          </span>
        </div>
      </div>
    </div>
  );
}
