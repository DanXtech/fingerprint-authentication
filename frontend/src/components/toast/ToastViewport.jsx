
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { ToastCard } from "./ToastCard";

const positionStyles = {
  "top-right":     "top-4 right-4 items-end",
  "top-left":      "top-4 left-4 items-start",
  "top-center":    "top-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-right":  "bottom-4 right-4 items-end flex-col-reverse",
  "bottom-left":   "bottom-4 left-4 items-start flex-col-reverse",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse",
};

export function ToastViewport({ position, toasts, onDismiss }) {
  const [portalEl, setPortalEl] = useState(null);

  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setPortalEl(el);

    return () => {
      setPortalEl(null);
      el.remove();
    };
  }, []);

  if (!portalEl) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-label="Notifications"
      className={`fixed z-[9999] flex flex-col gap-2 w-[340px] pointer-events-none ${positionStyles[position]}`}
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    portalEl
  );
}