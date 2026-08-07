import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { IconCheck, IconAlertTriangle, IconClose } from '../icons';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ toast: (type: ToastType, message: string) => void }>({
  toast: () => {},
});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const styles: Record<ToastType, { bg: string; icon: ReactNode; iconBg: string }> = {
    success: {
      bg: 'bg-white border-green-200',
      iconBg: 'bg-green-100 text-green-700',
      icon: <IconCheck size={16} />,
    },
    error: {
      bg: 'bg-white border-red-200',
      iconBg: 'bg-red-100 text-red-700',
      icon: <IconAlertTriangle size={16} />,
    },
    info: {
      bg: 'bg-white border-blue-200',
      iconBg: 'bg-blue-100 text-blue-700',
      icon: <IconAlertTriangle size={16} />,
    },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const s = styles[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg animate-[slideIn_.2s_ease-out] ${s.bg}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
                {s.icon}
              </span>
              <p className="flex-1 pt-0.5 text-sm text-slate-700">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Dismiss"
              >
                <IconClose size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
