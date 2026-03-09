import React, { useEffect, useState } from "react";

const RELEASE_VERSION = "D-01.005.00.0";
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
            <li><strong>Подписка:</strong> карточки тарифов Basic и Pro, обновлённый FAQ без технических деталей</li>
            <li><strong>Профиль:</strong> раздел «Подписка» вынесен в начало, нумерация шагов, «Мои запросы» в блоке профиля лаборатории</li>
            <li><strong>Дашборд:</strong> упрощённая аналитика, общие рекомендации вместо коэффициентов, без персональных подсказок по карточкам</li>
            <li><strong>Главная:</strong> карусели автоматически листаются каждые 5 секунд, в разное время</li>
          </ul>
        </div>
        <button type="button" className="release-banner__btn" onClick={handleDismiss}>
          Понятно
        </button>
      </div>
    </div>
  );
}
