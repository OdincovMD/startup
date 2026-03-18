import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const RELEASE_VERSION = "D-01.007.00";
const STORAGE_KEY = `synthesium_release_banner_${RELEASE_VERSION}`;

export default function ReleaseBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setVisible(false);
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="release-banner" role="dialog" aria-live="polite" aria-label="Что нового">
      <div className="release-banner__inner">
        <div className="release-banner__icon" aria-hidden>
          <Sparkles size={20} />
        </div>
        <div className="release-banner__content">
          <div className="release-banner__header">
            <strong className="release-banner__title">Что нового</strong>
            <span className="release-banner__version">{RELEASE_VERSION}</span>
          </div>
          <ul className="release-banner__list">
            <li><strong>Брендинг:</strong> единый плейсхолдер для сущностей без фото; favicon в табе браузера</li>
            <li><strong>Соискатели:</strong> страница доступна администраторам без подписки; исправлено overlap кнопок</li>
            <li><strong>Политика конфиденциальности:</strong> новая страница с оглавлением и актуальным текстом</li>
            <li><strong>Подписка:</strong> исправлена вёрстка блока «Оформить подписку»</li>
          </ul>
        </div>
        <button type="button" className="release-banner__btn" onClick={handleDismiss}>
          Понятно
        </button>
      </div>
    </div>
  );
}
