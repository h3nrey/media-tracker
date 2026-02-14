import { Injectable, signal } from '@angular/core';

export interface UserPreferences {
  startYear?: number; // Minimum year for date pickers (e.g., birth year)
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY = 'user_preferences';
  
  preferences = signal<UserPreferences>(this.loadPreferences());

  private loadPreferences(): UserPreferences {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private savePreferences(prefs: UserPreferences): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    this.preferences.set(prefs);
  }

  setStartYear(year: number | undefined): void {
    const current = this.preferences();
    this.savePreferences({ ...current, startYear: year });
  }

  getStartYear(): number | undefined {
    return this.preferences().startYear;
  }
}
