import { Injectable, signal } from '@angular/core';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private isOpen = signal(false);
  private options = signal<AlertOptions | null>(null);
  private resolveFn?: (value: boolean) => void;

  readonly isAlertOpen = this.isOpen.asReadonly();
  readonly alertOptions = this.options.asReadonly();

  showAlert(message: string, title: string = 'Alert', type: AlertOptions['type'] = 'info'): Promise<boolean> {
    return this.show({
      message,
      title,
      type,
      showCancel: false,
      confirmText: 'OK'
    });
  }

  showConfirm(message: string, title: string = 'Confirm', type: AlertOptions['type'] = 'warning'): Promise<boolean> {
    return this.show({
      message,
      title,
      type,
      showCancel: true,
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });
  }

  private show(options: AlertOptions): Promise<boolean> {
    this.options.set(options);
    this.isOpen.set(true);
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  confirm() {
    this.isOpen.set(false);
    this.resolveFn?.(true);
  }

  cancel() {
    this.isOpen.set(false);
    this.resolveFn?.(false);
  }
}
