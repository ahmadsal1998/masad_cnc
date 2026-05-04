import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import type { ToastItem } from '../../context/ToastContext';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on mount
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 min-w-[260px] max-w-xs w-full',
        'rounded-xl shadow-lg px-4 py-3 text-sm font-medium',
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        isSuccess
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white',
      ].join(' ')}
    >
      <span className="shrink-0 mt-0.5">
        {isSuccess
          ? <CheckCircle2 size={18} />
          : <XCircle size={18} />
        }
      </span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="إغلاق"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-2 items-start"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
