import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogRef } from '@angular/cdk/dialog';
import { LucideAngularModule, Mail, Lock, User, X, Eye, EyeOff, Loader2 } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'login' | 'signup' | 'reset';

@Component({
  selector: 'app-auth-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './auth-dialog.component.html',
  styleUrl: './auth-dialog.component.scss'
})
export class AuthDialogComponent {
  private dialogRef = inject(DialogRef);
  private router = inject(Router);
  authService = inject(AuthService);

  mode = signal<AuthMode>('login');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  displayName = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly UserIcon = User;
  readonly XIcon = X;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly LoaderIcon = Loader2;

  get isLogin() {
    return this.mode() === 'login';
  }

  get isSignup() {
    return this.mode() === 'signup';
  }

  get isReset() {
    return this.mode() === 'reset';
  }

  get isValid() {
    if (this.isReset) {
      return this.email().trim() !== '' && this.isValidEmail(this.email());
    }

    if (this.isSignup) {
      return (
        this.email().trim() !== '' &&
        this.password().trim() !== '' &&
        this.confirmPassword().trim() !== '' &&
        this.password() === this.confirmPassword() &&
        this.password().length >= 6 &&
        this.isValidEmail(this.email())
      );
    }

    return (
      this.email().trim() !== '' &&
      this.password().trim() !== '' &&
      this.isValidEmail(this.email())
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  switchMode(mode: AuthMode) {
    this.mode.set(mode);
    this.password.set('');
    this.confirmPassword.set('');
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(v => !v);
  }

  async submit() {
    if (!this.isValid) return;

    if (this.isLogin) {
      const result = await this.authService.signIn(this.email(), this.password());
      if (result.success) {
        this.close();
        this.router.navigate(['/']); // Redirect to home
      }
    } else if (this.isSignup) {
      const result = await this.authService.signUp(
        this.email(),
        this.password(),
        this.displayName() || undefined
      );
      if (result.success) {
        this.close();
        this.router.navigate(['/']); // Redirect to home
      }
    } else if (this.isReset) {
      const result = await this.authService.resetPassword(this.email());
      if (result.success) {
        this.switchMode('login');
      }
    }
  }

  close() {
    this.dialogRef.close();
  }
}
