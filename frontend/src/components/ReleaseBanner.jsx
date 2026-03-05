import React, { useEffect, useState } from "react";

const RELEASE_VERSION = "D-01.004.00.0";
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
        <div className="release-banner__content">
          <strong className="release-banner__title">Что нового</strong>
          <span className="release-banner__version">release/{RELEASE_VERSION}</span>
          <ul className="release-banner__list">
            <li><strong>Глобальный поиск:</strong> единая строка на главной для поиска вакансий, организаций, лабораторий и запросов</li>
            <li><strong>Подсказки при поиске:</strong> автодополнение на страницах вакансий, организаций, лабораторий и запросов</li>
            <li><strong>Выпадающий список на мобильных:</strong> подсказки всегда отображаются под строкой поиска</li>
          </ul>
        </div>
        <button type="button" className="release-banner__btn" onClick={handleDismiss}>
          Понятно
        </button>
      </div>
    </div>
  );
}
