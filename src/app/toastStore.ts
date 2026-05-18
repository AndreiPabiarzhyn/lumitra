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

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pushToast: (title, tone = 'info') => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { id, title, tone }].slice(-4) }));
    window.setTimeout(() => get().removeToast(id), 3200);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
