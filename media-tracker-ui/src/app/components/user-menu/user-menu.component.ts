import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ChevronDown, LogOut } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  showUserDropdown = signal(false);

  readonly ChevronDownIcon = ChevronDown;
  readonly LogOutIcon = LogOut;

  toggleUserMenu() {
    this.showUserDropdown.update(v => !v);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  async signOut() {
    this.showUserDropdown.set(false);
    await this.authService.signOut();
    this.router.navigate(['/landing']);
  }
}
