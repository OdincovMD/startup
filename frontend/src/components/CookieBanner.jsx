import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "synthesium_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted") {
        setVisible(false);
      } else {
        setVisible(true);
      }
    } catch {
      // Если localStorage недоступен — просто показываем баннер.
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // игнорируем ошибки записи
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Уведомление об использовании файлов cookie">
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          Мы используем файлы cookie для работы сайта, аналитики и улучшения сервиса. Продолжая пользоваться сайтом, вы
          соглашаетесь с использованием cookie. Подробнее&nbsp;— в{" "}
          <Link to="/privacy" className="cookie-banner__link">
            политике конфиденциальности
          </Link>
          .
        </p>
        <button type="button" className="cookie-banner__btn" onClick={handleAccept}>
          Понятно
        </button>
      </div>
    </div>
  );
}

