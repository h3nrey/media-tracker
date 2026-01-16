import { Injectable, signal, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, filter } from 'rxjs';
import { ViewModeService } from './view-mode.service';

export interface Shortcut {
  id: string;
  key: string;
  label: string;
  description: string;
  category: 'Global' | 'Navigation' | 'Actions' | 'Page Specific';
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ShortcutService {
  private router = inject(Router);
  private ngZone = inject(NgZone);
  
  isOpen = signal(false);
  private lastKey = '';
  private lastKeyTime = 0;
  private sequenceTimeout = 1000;
  
  private viewModeService = inject(ViewModeService);
  
  private defaultShortcuts: Shortcut[] = [
    { id: 'goto-lists', key: 'g l', label: 'Go to Lists', description: 'Navigate to the collections page', category: 'Navigation', action: () => this.router.navigate(['/lists']) },
    { id: 'goto-timeline', key: 'g t', label: 'Go to Timeline', description: 'Navigate to the yearly timeline', category: 'Navigation', action: () => this.router.navigate(['/timeline']) },
    { id: 'goto-home', key: 'g h', label: 'Go to Home', description: 'Navigate to the dashboard', category: 'Navigation', action: () => this.router.navigate(['/']) },
    { id: 'goto-discovery', key: 'g d', label: 'Go to Discovery', description: 'Navigate to recommendations', category: 'Navigation', action: () => this.router.navigate(['/recommendation']) },
    { id: 'goto-browse', key: 'g b', label: 'Go to Browse', description: 'Navigate to search page', category: 'Navigation', action: () => this.router.navigate(['/browse']) },
    { id: 'goto-stats', key: 'g s', label: 'Go to Stats', description: 'Navigate to statistics', category: 'Navigation', action: () => this.router.navigate(['/stats']) },
    { id: 'toggle-view', key: 'v', label: 'Toggle View', description: 'Switch between Kanban and List view', category: 'Actions', action: () => this.viewModeService.toggleMode() },
    { id: 'show-shortcuts', key: '?', label: 'Show Shortcuts', description: 'Open this help dialog', category: 'Global', action: () => this.open() },
    { id: 'close-all', key: 'escape', label: 'Close', description: 'Close dialogs or overlays', category: 'Global', action: () => this.close() },
  ];

  private shortcuts = signal<Shortcut[]>([]);

  constructor() {
    this.loadShortcuts();
    this.initListener();
  }

  private loadShortcuts() {
    const stored = localStorage.getItem('user_shortcuts');
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = this.defaultShortcuts.map(def => {
        const custom = parsed.find((p: any) => p.id === def.id);
        return custom ? { ...def, key: custom.key } : def;
      });
      this.shortcuts.set(merged);
    } else {
      this.shortcuts.set([...this.defaultShortcuts]);
    }
  }

  private saveShortcuts() {
    const toStore = this.shortcuts().map(s => ({ id: s.id, key: s.key }));
    localStorage.setItem('user_shortcuts', JSON.stringify(toStore));
  }

  updateShortcutKey(id: string, newKey: string) {
    this.shortcuts.update(list => list.map(s => s.id === id ? { ...s, key: newKey } : s));
    this.saveShortcuts();
  }

  private initListener() {
    fromEvent<KeyboardEvent>(window, 'keydown').pipe(
      filter(event => {
        const target = event.target as HTMLElement;
        return !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      })
    ).subscribe(event => {
      const key = event.key.toLowerCase();
      const now = Date.now();
      
      // Handle sequences
      if (this.lastKey === 'g' && (now - this.lastKeyTime) < this.sequenceTimeout) {
        const seq = `g ${key}`;
        const shortcut = this.shortcuts().find(s => s.key === seq);
        if (shortcut?.action) {
          event.preventDefault();
          this.ngZone.run(() => shortcut.action!());
          this.lastKey = '';
          return;
        }
      }

      // Handle single keys
      const shortcut = this.shortcuts().find(s => s.key === key);
      if (shortcut?.action) {
        event.preventDefault();
        this.ngZone.run(() => shortcut.action!());
      } else if (key === 'g') {
        this.lastKey = 'g';
        this.lastKeyTime = now;
      } else {
        this.lastKey = '';
      }
    });
  }

  registerShortcut(shortcut: Shortcut) {
    this.shortcuts.update(s => [...s, shortcut]);
  }

  unregisterShortcut(key: string) {
    this.shortcuts.update(s => s.filter(sh => sh.key !== key));
  }

  getShortcuts() {
    return this.shortcuts;
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle() {
    this.isOpen.update(v => !v);
  }
}
