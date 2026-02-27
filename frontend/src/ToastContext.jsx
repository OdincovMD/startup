import React, { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

const TOAST_DURATION = 3000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const container = typeof document !== "undefined" ? document.body : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {container &&
        createPortal(
          <div className="toast-container" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={`toast toast--${t.type}`}>
                {t.message}
              </div>
            ))}
          </div>,
          container
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
