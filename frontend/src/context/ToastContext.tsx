"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastCtx {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

const ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration ?? DEFAULT_DURATION);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className={`toast toast-${toast.variant}`} role="status">
      <span className="toast-icon" aria-hidden="true">{ICONS[toast.variant]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info", duration?: number) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, variant, message, duration }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="toast-container"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
