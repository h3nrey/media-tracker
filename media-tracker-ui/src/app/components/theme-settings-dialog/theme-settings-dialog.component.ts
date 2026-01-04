import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Palette, Type, Layout, MousePointer2 } from 'lucide-angular';
import { ThemeService, ThemeSettings } from '../../services/theme.service';

import { ColorPickerDirective } from 'ngx-color-picker';

@Component({
  selector: 'app-theme-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ColorPickerDirective],
  templateUrl: './theme-settings-dialog.component.html',
  styleUrl: './theme-settings-dialog.component.scss'
})
export class ThemeSettingsDialogComponent {
  private themeService = inject(ThemeService);

  isOpen = signal(false);
  
  // Local copies for the form
  settings: ThemeSettings = {
    primaryColor: '',
    backgroundColor: '',
    surfaceColor: '',
    textColorPrimary: '',
    textColorSecondary: '',
    borderColor: '',
    mainFont: '',
    emphasisFont: ''
  };

  popularFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Outfit', 'Poppins', 'Playpair Display', 'Raleway', 
    'Lexend', 'Ubuntu', 'Merriweather', 'Noto Sans'
  ];

  readonly XIcon = X;
  readonly PaletteIcon = Palette;
  readonly TypeIcon = Type;
  readonly LayoutIcon = Layout;
  readonly CursorIcon = MousePointer2;

  open() {
    this.settings = { ...this.themeService.settings() };
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  save() {
    this.themeService.updateSettings(this.settings);
    this.close();
  }

  reset() {
    this.settings = {
      primaryColor: '#64f65c',
      backgroundColor: '#0B0E14',
      surfaceColor: '#161B22',
      textColorPrimary: '#F0F6FC',
      textColorSecondary: '#8B949E',
      borderColor: '#30363D',
      mainFont: 'Inter',
      emphasisFont: 'Inter'
    };
  }
}
