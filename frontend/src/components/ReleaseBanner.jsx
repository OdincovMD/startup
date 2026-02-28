import React, { useEffect, useState } from "react";

const RELEASE_VERSION = "D-01.000.00.0";
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
            <li>Отклик на вакансию: письмо на email с данными кандидата, ссылкой на резюме и профиль</li>
            <li>Ссылка на вакансию в письме об отклике</li>
            <li>Если у контакта нет email — письмо уходит на email создателя вакансии</li>
            <li>Предупреждение при создании вакансии, если у контакта не указан email</li>
            <li>Данные кандидата берутся из профиля текущей роли (студент или исследователь)</li>
            <li><strong>Исправления:</strong> при отклике под ролью студент данные брались из профиля исследователя — теперь используются данные текущей роли</li>
            <li><strong>Исправления:</strong> резюме в письме — вместо вложения (no_name.pdf) теперь ссылка для скачивания</li>
            <li><strong>Исправления:</strong> кнопка смены пароля недоступна до подтверждения почты</li>
            <li><strong>Исправления:</strong> при подтверждении почты больше не сбрасывается сессия («Сессия истекла»)</li>
            <li><strong>Исправления:</strong> уведомления на телефоне — колокольчик вынесен рядом с кнопкой меню</li>
            <li><strong>Исправления:</strong> добавлены уведомления об успешном выполнении операций (Сохранить и т.д.)</li>
            <li><strong>Исправления:</strong> кнопка «Привязать ROR» приведена к единому стилю с научными профилями</li>
            <li><strong>Исправления:</strong> сообщение «Organization profile not found» заменено на понятное «Сначала заполните и сохраните профиль организации»</li>
            <li><strong>Исправления:</strong> карточка лабораторий при редактировании больше не съезжает вправо (оборудование, сотрудники, задачи, запросы, вакансии)</li>
            <li><strong>Исправления:</strong> подвязка к лаборатории из карты сущности корректно отображается при редактировании в профиле</li>
            <li><strong>Исправления:</strong> детализации на дашборде больше не уезжают вправо</li>
            <li><strong>Исправления:</strong> после перехода по ссылке уведомления на телефоне панель уведомлений закрывается</li>
            <li><strong>Исправления:</strong> нельзя удалять контактное лицо или лабораторию, если к ним привязаны запросы или вакансии</li>
            <li><strong>Исправления:</strong> при выходе с карточки (вакансия и др.) пользователь возвращается туда, где был, а не к списку</li>
          </ul>
        </div>
        <button type="button" className="release-banner__btn" onClick={handleDismiss}>
          Понятно
        </button>
      </div>
    </div>
  );
}
