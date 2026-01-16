import { Component, inject, signal, HostListener, EffectRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Keyboard, Edit2, Check, RotateCcw } from 'lucide-angular';
import { ShortcutService } from '../../services/shortcut.service';

@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './shortcuts-dialog.component.html',
  styleUrl: './shortcuts-dialog.component.scss'
})
export class ShortcutsDialogComponent {
  shortcutService = inject(ShortcutService);
  
  readonly XIcon = X;
  readonly KeyboardIcon = Keyboard;
  readonly EditIcon = Edit2;
  readonly CheckIcon = Check;
  readonly ResetIcon = RotateCcw;

  isOpen = this.shortcutService.isOpen;
  shortcuts = this.shortcutService.getShortcuts();
  
  recordingShortcutId = signal<string | null>(null);
  recordedKeys = signal<string[]>([]);
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isOpen() || !this.recordingShortcutId()) return;

    event.preventDefault();
    event.stopPropagation();

    const key = event.key.toLowerCase();
    
    if (key === 'escape') {
      this.cancelRecording();
      return;
    }

    if (key === 'enter' && this.recordedKeys().length > 0) {
      this.saveRecording();
      return;
    }

    if (key === 'backspace') {
      this.recordedKeys.update(keys => keys.slice(0, -1));
      return;
    }

    // Don't add duplicate modifiers or more than 2 segments for now to keep it simple
    if (this.recordedKeys().length < 2 && !['control', 'shift', 'alt', 'meta'].includes(key)) {
      this.recordedKeys.update(keys => [...keys, key]);
    }
  }

  startRecording(id: string) {
    this.recordingShortcutId.set(id);
    this.recordedKeys.set([]);
  }

  cancelRecording() {
    this.recordingShortcutId.set(null);
    this.recordedKeys.set([]);
  }

  saveRecording() {
    if (this.recordedKeys().length > 0) {
      const newKey = this.recordedKeys().join(' ');
      this.shortcutService.updateShortcutKey(this.recordingShortcutId()!, newKey);
    }
    this.cancelRecording();
  }

  getShortcutsByCategory(category: string) {
    return this.shortcuts().filter(s => s.category === category);
  }

  get categories() {
    const cats = new Set(this.shortcuts().map(s => s.category));
    return Array.from(cats);
  }

  close() {
    this.shortcutService.close();
  }
}
