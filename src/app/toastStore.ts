import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning';

export type ToastMessage = {
  id: string;
  title: string;
  tone: ToastTone;
};

type ToastState = {
  toasts: ToastMessage[];
  pushToast: (title: string, tone?: ToastTone) => void;
  removeToast: (id: string) => void;
};

const MAX_TOASTS = 2;
const TOAST_TTL = 2400;
const toastTimers = new Map<string, number>();

const clearToastTimer = (id: string) => {
  const timer = toastTimers.get(id);

  if (timer) {
    window.clearTimeout(timer);
    toastTimers.delete(id);
  }
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pushToast: (title, tone = 'info') => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => {
      const next = [
        ...state.toasts.filter((toast) => toast.title !== title),
        { id, title, tone },
      ].slice(-MAX_TOASTS);
      const visibleIds = new Set(next.map((toast) => toast.id));

      state.toasts.forEach((toast) => {
        if (!visibleIds.has(toast.id)) {
          clearToastTimer(toast.id);
        }
      });

      return { toasts: next };
    });

    toastTimers.set(id, window.setTimeout(() => get().removeToast(id), TOAST_TTL));
  },
  removeToast: (id) => {
    clearToastTimer(id);
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));
