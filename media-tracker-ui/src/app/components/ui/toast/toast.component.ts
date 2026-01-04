import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../services/toast.service';
import { LucideAngularModule, X, CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  toastService = inject(ToastService);
  toasts = this.toastService.toasts;

  readonly XIcon = X;
  readonly SuccessIcon = CheckCircle;
  readonly InfoIcon = Info;
  readonly WarningIcon = AlertTriangle;
  readonly ErrorIcon = AlertCircle;

  getIcon(type: string) {
    switch (type) {
      case 'success': return this.SuccessIcon;
      case 'warning': return this.WarningIcon;
      case 'error': return this.ErrorIcon;
      default: return this.InfoIcon;
    }
  }

  remove(id: string) {
    this.toastService.remove(id);
  }

  handleAction(toast: Toast) {
    if (toast.action) {
      toast.action.action();
      this.remove(toast.id);
    }
  }
}
