import React, { useEffect, useState } from "react";

const RELEASE_VERSION = "D-01.006.00.0";
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
            <li><strong>Поиск:</strong> при пустых результатах — блок «Посмотрите другие» с рекомендованными вакансиями, запросами, лабораториями и организациями</li>
            <li><strong>Соискатели:</strong> доступ только с активной подпиской; исправлены подсказки (имена вместо ID) и отображение аватаров при поиске</li>
            <li><strong>Подписка:</strong> добавлен доступ к каталогу соискателей в Basic и Pro; FAQ о требованиях подписки</li>
            <li><strong>Профиль:</strong> вкладка «Подписка» перенесена после «Личные данные»</li>
          </ul>
        </div>
        <button type="button" className="release-banner__btn" onClick={handleDismiss}>
          Понятно
        </button>
      </div>
    </div>
  );
}
