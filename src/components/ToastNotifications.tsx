import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { useToastStore } from '../app/toastStore';

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
};

export function ToastNotifications() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="toast-stack" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];

        return (
          <button
            key={toast.id}
            type="button"
            className={`toast-message toast-${toast.tone}`}
            onClick={() => removeToast(toast.id)}
          >
            <Icon size={16} />
            <span>{toast.title}</span>
          </button>
        );
      })}
    </div>
  );
}
