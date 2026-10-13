import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message, { duration = type === 'error' ? 6000 : 3500 } = {}) => {
      if (!message) return;
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list.slice(-4), { id, type, message }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div key={toast.id} className={`toast toast--${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
              <Icon size={18} className="toast__icon" />
              <span className="toast__message">{toast.message}</span>
              <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="close">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
