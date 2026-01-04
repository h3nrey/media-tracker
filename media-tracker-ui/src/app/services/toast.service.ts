import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  action: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration: number;
  action?: ToastAction;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, options: Partial<Omit<Toast, 'id' | 'message'>> = {}) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration || 5000,
      action: options.action
    };

    this.toasts.update(t => [...t, toast]);

    if (toast.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, toast.duration);
    }
  }

  success(message: string, action?: ToastAction) {
    this.show(message, { type: 'success', action });
  }

  info(message: string, action?: ToastAction) {
    this.show(message, { type: 'info', action });
  }

  warning(message: string, action?: ToastAction) {
    this.show(message, { type: 'warning', action });
  }

  error(message: string, action?: ToastAction) {
    this.show(message, { type: 'error', action });
  }

  remove(id: string) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
