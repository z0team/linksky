'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const iconMap = {
  success: <CheckCircle2 size={16} />,
  error: <CircleAlert size={16} />,
  info: <Info size={16} />,
};

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-400/30 bg-red-500/10 text-red-100',
  info: 'border-white/15 bg-white/10 text-white',
};

const createToastId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: ToastInput) => {
      const id = createToastId();
      setToasts((current) => [...current, { id, variant: 'info', ...toast }]);
      const timer = window.setTimeout(() => removeToast(id), 3200);
      timersRef.current.set(id, timer);
    }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({
    pushToast,
  }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl ${variantClasses[toast.variant || 'info']}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {iconMap[toast.variant || 'info']}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-white/75">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return value;
};
