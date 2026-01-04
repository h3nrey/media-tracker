import { Injectable, signal, effect } from '@angular/core';

export interface ThemeSettings {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColorPrimary: string;
  textColorSecondary: string;
  borderColor: string;
  mainFont: string;
  emphasisFont: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'anime-tracker-theme-v2';
  
  settings = signal<ThemeSettings>({
    primaryColor: '#64f65c',
    backgroundColor: '#0B0E14',
    surfaceColor: '#161B22',
    textColorPrimary: '#F0F6FC',
    textColorSecondary: '#8B949E',
    borderColor: '#30363D',
    mainFont: 'Inter',
    emphasisFont: 'Inter'
  });

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.settings.set(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse theme settings', e);
      }
    }

    // Effect to apply settings to CSS variables
    effect(() => {
      const s = this.settings();
      const root = document.documentElement;
      
      // Colors
      root.style.setProperty('--app-primary', s.primaryColor);
      root.style.setProperty('--app-bg', s.backgroundColor);
      root.style.setProperty('--app-surface', s.surfaceColor);
      root.style.setProperty('--app-text-primary', s.textColorPrimary);
      root.style.setProperty('--app-text-secondary', s.textColorSecondary);
      root.style.setProperty('--app-border', s.borderColor);
      
      // Derived surface light/hover for better contrast
      root.style.setProperty('--app-surface-light', this.lightenColor(s.surfaceColor, 5));
      root.style.setProperty('--app-surface-hover', this.lightenColor(s.surfaceColor, 10));

      // Fonts
      root.style.setProperty('--app-font-main', this.formatFontFamily(s.mainFont));
      root.style.setProperty('--app-font-emphasis', this.formatFontFamily(s.emphasisFont));
      
      // Update Google Fonts link
      this.updateGoogleFonts([s.mainFont, s.emphasisFont]);

      // Update glow to match primary
      const rgb = this.hexToRgb(s.primaryColor);
      if (rgb) {
        root.style.setProperty('--app-primary-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(s));
    });
  }

  updateSettings(updates: Partial<ThemeSettings>) {
    this.settings.update(s => ({ ...s, ...updates }));
  }

  private formatFontFamily(font: string): string {
    if (font.includes("'") || font.includes('"')) return font;
    return `'${font}', sans-serif`;
  }

  private updateGoogleFonts(fonts: string[]) {
    const uniqueFonts = [...new Set(fonts)].map(f => f.replace(/\s+/g, '+'));
    const linkId = 'google-fonts-theme';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    link.href = `https://fonts.googleapis.com/css2?${uniqueFonts.map(f => `family=${f}:wght@400;500;600;700;800`).join('&')}&display=swap`;
  }

  private hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private lightenColor(hex: string, percent: number) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.min(255, Math.floor(rgb.r * (1 + percent / 100)));
    const g = Math.min(255, Math.floor(rgb.g * (1 + percent / 100)));
    const b = Math.min(255, Math.floor(rgb.b * (1 + percent / 100)));
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}
