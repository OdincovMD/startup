/**
 * Карусель с перелистыванием для главной страницы.
 * Бесконечный цикл, авто-сдвиг каждые 5 секунд.
 * phaseIndex — сдвиг фазы (0,1,2…), чтобы карусели не листались синхронно.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

const AUTO_ADVANCE_MS = 5000;
const PHASE_STEP_MS = 1600;
const TRANSITION_MS = 400;
const GAP_REM = 1.5;
const GAP_REM_SM = 1;

function useItemsPerView() {
  const [itemsPerView, setItemsPerView] = useState(3);
  useEffect(() => {
    const mq = (max) => window.matchMedia(`(max-width: ${max}px)`).matches;
    const update = () => {
      if (mq(480)) setItemsPerView(1);
      else if (mq(768)) setItemsPerView(2);
      else setItemsPerView(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return itemsPerView;
}

function getGapPx() {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return window.innerWidth <= 768 ? GAP_REM_SM * rem : GAP_REM * rem;
}

export default function FeaturedCarousel({ items, renderCard, ariaLabel, phaseIndex = 0 }) {
  const itemsPerView = useItemsPerView();
  const list = items || [];
  const timerRef = useRef(null);
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportWidth(el.offsetWidth);
    });
    ro.observe(el);
    setViewportWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Дублируем элементы для бесшовного цикла: [A,B,C, A,B,C]
  const extendedList = list.length > 0 ? [...list, ...list] : [];
  const totalExtended = extendedList.length;

  const [offset, setOffset] = useState(0);
  const [disableTransition, setDisableTransition] = useState(false);
  const offsetRef = useRef(0);
  offsetRef.current = offset;

  const [autoAdvanceKey, setAutoAdvanceKey] = useState(0);

  const gap = viewportWidth > 0 ? getGapPx() : GAP_REM * 16;
  const cellWidth = viewportWidth > 0 && itemsPerView > 0 ? Math.max(0, (viewportWidth - (itemsPerView - 1) * gap) / itemsPerView) : 280;
  const step = cellWidth + gap;
  const translatePx = offset * step;

  const goPrev = useCallback(() => {
    if (list.length <= itemsPerView) return;
    const o = offsetRef.current;
    if (o <= 0) {
      setDisableTransition(true);
      setOffset(list.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisableTransition(false);
          setOffset(list.length - 1);
        });
      });
    } else {
      setDisableTransition(false);
      setOffset((prev) => prev - 1);
    }
  }, [list.length, itemsPerView]);

  const goNext = useCallback(() => {
    if (list.length <= itemsPerView) return;
    setDisableTransition(false);
    setOffset((o) => {
      const next = o + 1;
      if (next >= totalExtended) return 0;
      return next;
    });
  }, [list.length, itemsPerView, totalExtended]);

  const handlePrev = useCallback(() => {
    setAutoAdvanceKey((k) => k + 1);
    goPrev();
  }, [goPrev]);

  const handleNext = useCallback(() => {
    setAutoAdvanceKey((k) => k + 1);
    goNext();
  }, [goNext]);

  const handleTransitionEnd = useCallback(() => {
    if (offset === list.length) {
      setDisableTransition(true);
      setOffset(0);
    } else if (offset === totalExtended - itemsPerView) {
      setDisableTransition(true);
      setOffset(list.length - itemsPerView);
    }
  }, [offset, list.length, totalExtended, itemsPerView]);

  useEffect(() => {
    if (list.length <= itemsPerView) return;
    const delayMs = (phaseIndex || 0) * PHASE_STEP_MS;
    const startId = setTimeout(() => {
      timerRef.current = setInterval(goNext, AUTO_ADVANCE_MS);
    }, delayMs);
    return () => {
      clearTimeout(startId);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [list.length, itemsPerView, goNext, autoAdvanceKey, phaseIndex]);

  const canGoPrev = list.length > itemsPerView;
  const canGoNext = list.length > itemsPerView;

  if (list.length === 0) {
    return null;
  }

  const trackWidth = totalExtended > 0 ? totalExtended * cellWidth + (totalExtended - 1) * gap : 0;

  return (
    <div className="featured-carousel" aria-label={ariaLabel}>
      <div ref={viewportRef} className="featured-carousel__viewport">
        <button
          type="button"
          className="featured-carousel__edge-btn featured-carousel__edge-btn--prev"
          onClick={handlePrev}
          disabled={!canGoPrev}
          aria-label="Предыдущие"
        >
          ←
        </button>
        <div
          className="featured-carousel__track featured-carousel__track--pixel"
          style={{
            "--cell-width": `${cellWidth}px`,
            "--gap-px": `${gap}px`,
            width: `${trackWidth}px`,
            transform: `translateX(-${translatePx}px)`,
            transition: disableTransition ? "none" : `transform ${TRANSITION_MS}ms ease-in-out`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedList.map((item, idx) => (
            <div key={`${item.id ?? idx}-${Math.floor(idx / list.length)}`} className="featured-carousel__cell">
              {renderCard(item)}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="featured-carousel__edge-btn featured-carousel__edge-btn--next"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Следующие"
        >
          →
        </button>
      </div>
    </div>
  );
}
