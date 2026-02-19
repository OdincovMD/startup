import React from "react";
import { normalizeWebsiteUrl, formatWebsiteDisplay } from "../utils/validation";

/**
 * Ссылка на сайт с корректным href и компактным отображением.
 * Добавляет https:// если протокол отсутствует.
 */
export default function WebsiteLink({ url, className }) {
  if (!url || !url.trim()) return null;
  const href = normalizeWebsiteUrl(url);
  const display = formatWebsiteDisplay(url) || url;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {display}
    </a>
  );
}
