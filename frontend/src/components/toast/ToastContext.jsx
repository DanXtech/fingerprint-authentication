
import {
  createContext, useCallback, useContext,
  useRef, useState,
} from "react";
import { ToastViewport } from "./ToastViewport";

const Ctx = createContext(null);

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION = "top-right";

export function ToastProvider({
  children,
  defaultPosition = DEFAULT_POSITION,
  defaultDuration = DEFAULT_DURATION,
}) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const toast = useCallback((opts) => {
    const id = `toast-${++counter.current}`;
    const item = {
      id,
      type:     opts.type     ?? "info",
      title:    opts.title,
      message:  opts.message  ?? "",
      duration: opts.duration ?? defaultDuration,
      position: opts.position ?? defaultPosition,
    };
    setToasts(prev => [...prev, item]);
  }, [defaultDuration, defaultPosition]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title, message) => toast({ type: "success", title, message }), [toast]);
  const error   = useCallback((title, message) => toast({ type: "error",   title, message }), [toast]);
  const warning = useCallback((title, message) => toast({ type: "warning", title, message }), [toast]);
  const info    = useCallback((title, message) => toast({ type: "info",    title, message }), [toast]);

  // Group toasts by position so each viewport only renders its own
  const groups = toasts.reduce((acc, t) => {
    (acc[t.position] ??= []).push(t);
    return acc;
  }, {});

  return (
    <Ctx.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      {Object.entries(groups).map(([position, items]) => (
        <ToastViewport
          key={position}
          position={position}
          toasts={items}
          onDismiss={dismiss}
        />
      ))}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}