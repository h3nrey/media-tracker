import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tooltip-wrapper">
      @if (title) {
        <div class="tooltip-title" [style.color]="color" [style.borderBottomColor]="color">
          {{ title }}
        </div>
      }
      <div class="tooltip-content">
        @for (item of items; track item) {
          <div class="tooltip-item">{{ item }}</div>
        }
      </div>
    </div>
  `,
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  @Input() title?: string;
  @Input() items: string[] = [];
  @Input() color: string = 'var(--app-primary)';
}
