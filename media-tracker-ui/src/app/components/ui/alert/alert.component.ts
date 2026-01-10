import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../../services/alert.service';
import { LucideAngularModule, AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-angular';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss'
})
export class AlertComponent {
  alertService = inject(AlertService);
  isOpen = this.alertService.isAlertOpen;
  options = this.alertService.alertOptions;

  readonly XIcon = X;
  readonly InfoIcon = Info;
  readonly SuccessIcon = CheckCircle;
  readonly WarningIcon = AlertTriangle;
  readonly ErrorIcon = AlertCircle;

  getIcon() {
    const type = this.options()?.type || 'info';
    switch (type) {
      case 'success': return this.SuccessIcon;
      case 'warning': return this.WarningIcon;
      case 'error': return this.ErrorIcon;
      default: return this.InfoIcon;
    }
  }

  onConfirm() {
    this.alertService.confirm();
  }

  onCancel() {
    this.alertService.cancel();
  }
}
