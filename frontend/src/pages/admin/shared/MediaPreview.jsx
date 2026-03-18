import React from "react";
import { FileText } from "lucide-react";
import { splitMedia, fileNameFromUrl } from "./utils";

/**
 * Preview for image URLs and document links.
 * Used in admin edit forms for avatar_url, image_urls, photo_url.
 */
export default function MediaPreview({ urls, onRemove, maxImages = 12 }) {
  if (!urls || (Array.isArray(urls) && urls.length === 0)) return null;
  const list = Array.isArray(urls) ? urls : (typeof urls === "string" ? urls.split("\n").map((s) => s.trim()).filter(Boolean) : []);
  const { images, docs } = splitMedia(list);
  if (images.length === 0 && docs.length === 0) return null;

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.slice(0, maxImages).map((url, idx) => (
            <div key={idx} className="image-preview">
              <img src={url} alt="" />
              {onRemove && (
                <button
                  type="button"
                  className="image-remove"
                  onClick={() => onRemove(idx)}
                  aria-label="Удалить"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="file-list">
          {docs.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="file-link"
            >
              <FileText size={14} style={{ verticalAlign: "middle", marginRight: "0.35rem" }} />
              {fileNameFromUrl(url)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
