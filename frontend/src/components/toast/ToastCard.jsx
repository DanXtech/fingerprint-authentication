
import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const config = {
  success: {
    icon:      <CheckCircle size={16} />,
    accent:    "bg-green-700",
    iconBg:    "bg-green-50",
    iconColor: "text-green-700",
    progress:  "bg-green-500",
  },
  error: {
    icon:      <XCircle size={16} />,
    accent:    "bg-red-700",
    iconBg:    "bg-red-50",
    iconColor: "text-red-700",
    progress:  "bg-red-500",
  },
  warning: {
    icon:      <AlertTriangle size={16} />,
    accent:    "bg-amber-700",
    iconBg:    "bg-amber-50",
    iconColor: "text-amber-700",
    progress:  "bg-amber-500",
  },
  info: {
    icon:      <Info size={16} />,
    accent:    "bg-blue-700",
    iconBg:    "bg-blue-50",
    iconColor: "text-blue-700",
    progress:  "bg-blue-500",
  },
};

/**
 * @param {{ toast: import("../../../types").ToastItem, onDismiss: (id: string) => void }} props
 */
export function ToastCard({ toast, onDismiss }) {
  const { id, type, title, message, duration } = toast;
  const cfg = config[type];
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);
  const timerRef = useRef(null);

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss + progress bar
  useEffect(() => {
    if (duration === 0) return;
    setProgressWidth(100);
    // Tiny delay so the transition from 100→0 is picked up
    const pRaf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setProgressWidth(0))
    );
    timerRef.current = setTimeout(() => handleDismiss(), duration);
    return () => {
      cancelAnimationFrame(pRaf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration]);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 280);
  };

  return (
    <div
      role="alert"
      aria-atomic="true"
      className={[
        "relative overflow-hidden pointer-events-auto",
        "bg-white border border-zinc-200 rounded-xl",
        "flex items-start gap-2.5 px-3.5 py-3 w-full",
        "transition-all duration-300",
        visible && !leaving
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-full",
      ].join(" ")}
    >
      {/* Left accent bar */}
     <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${cfg.accent}`} aria-hidden="true" />
      {/* Icon */}
      <div className={`ml-1 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pt-px">
        <p className="text-[13px] font-semibold text-zinc-900 leading-snug">{title}</p>
        {message && (
          <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{message}</p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="mt-0.5 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 rounded"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <span
          aria-hidden="true"
          className={`absolute bottom-0 left-0 h-0.5 rounded-bl-xl ${cfg.progress}`}
          style={{
            width: `${progressWidth}%`,
            transition: `width ${duration}ms linear`,
          }}
        />
      )}
    </div>
  );
}