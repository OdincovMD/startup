import { useEffect } from "react";

/**
 * Блокирует скролл страницы на мобильных при открытом overlay редактирования.
 * Скролл доступен только внутри формы overlay.
 */
export function useEditOverlayScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    if (window.innerWidth > 768) return;

    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty("--scroll-y", String(scrollY));
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add("edit-overlay-open");

    return () => {
      document.body.classList.remove("edit-overlay-open");
      document.body.style.removeProperty("--scroll-y");
      document.body.style.removeProperty("padding-right");
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    };
  }, [isOpen]);
}
