import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { LucideAngularModule, LogIn } from 'lucide-angular';
import { AuthDialogComponent } from '../auth-dialog/auth-dialog.component';

@Component({
  selector: 'app-login-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './login-button.component.html',
  styleUrl: './login-button.component.scss'
})
export class LoginButtonComponent {
  private dialog = inject(Dialog);

  readonly LogInIcon = LogIn;

  openAuthDialog() {
    this.dialog.open(AuthDialogComponent, {
      width: '400px',
      maxWidth: '90vw',
      panelClass: 'auth-dialog-panel'
    });
  }
}
