import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';
import { UserPreferencesService } from '../../services/user-preferences.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent {
  isOpen = input<boolean>(false);
  close = output<void>();

  private preferencesService = inject(UserPreferencesService);

  readonly XIcon = X;
  currentYear = new Date().getFullYear();

  currentStartYear = computed(() => this.preferencesService.getStartYear());

  updateStartYear(value: string) {
    const year = parseInt(value, 10);
    if (!isNaN(year) && year >= 1900 && year <= this.currentYear) {
      this.preferencesService.setStartYear(year);
    }
  }

  clearStartYear() {
    this.preferencesService.setStartYear(undefined);
  }
}
