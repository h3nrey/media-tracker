import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-tag-chip',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  host: {
    'style': 'display: inline-block;'
  },
  template: `
    <button 
      class="tag-chip" 
      [class.active]="active"
      [class.removable]="removable"
      (click)="clicked.emit($event)">
      <lucide-icon *ngIf="icon" [img]="icon" [size]="12"></lucide-icon>
      <span class="label">{{ label }}</span>
      <lucide-icon *ngIf="removable" [img]="XIcon" [size]="10" class="remove-icon"></lucide-icon>
    </button>
  `,
  styles: [`
    .tag-chip {
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--app-border);
      background: var(--app-bg);
      color: var(--app-text-secondary);
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      user-select: none;

      &:hover {
        border-color: var(--app-primary);
        color: var(--app-text-primary);
        background: var(--app-surface-light);
        transform: translateY(-1px);
      }

      &.active {
        background: var(--app-primary-glow);
        color: var(--app-primary);
        border-color: var(--app-primary);
        box-shadow: 0 4px 12px var(--app-primary-glow);
      }

      .remove-icon {
        opacity: 0.6;
        transition: opacity 0.2s;
        
        &:hover {
          opacity: 1;
        }
      }

      &.removable {
        padding-right: 0.45rem;
      }
    }
  `]
})
export class TagChipComponent {
  @Input() label: string = '';
  @Input() icon?: any;
  @Input() active: boolean = false;
  @Input() removable: boolean = false;
  @Output() clicked = new EventEmitter<MouseEvent>();
  
  readonly XIcon = X;
}
