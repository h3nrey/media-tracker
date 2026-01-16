import { Injectable, signal } from '@angular/core';

export type ViewMode = 'kanban' | 'list';

@Injectable({
  providedIn: 'root'
})
export class ViewModeService {
  private mode = signal<ViewMode>(this.getSavedMode());

  readonly viewMode = this.mode.asReadonly();

  setMode(mode: ViewMode) {
    this.mode.set(mode);
    localStorage.setItem('anime-library-view-mode', mode);
  }

  toggleMode() {
    this.setMode(this.mode() === 'kanban' ? 'list' : 'kanban');
  }

  private getSavedMode(): ViewMode {
    return (localStorage.getItem('anime-library-view-mode') as ViewMode) || 'kanban';
  }
}
