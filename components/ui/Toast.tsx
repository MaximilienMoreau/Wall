"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-red-600" aria-hidden />,
  info: <Info className="h-5 w-5 text-accent" aria-hidden />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 shadow-lg"
          >
            {ICONS[t.kind]}
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
