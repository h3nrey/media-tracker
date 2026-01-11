import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';

@Component({
  selector: 'app-star-rating-input',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="score-rating" (mouseleave)="onHover(null)">
      <div class="stars">
        @for (star of [1, 2, 3, 4, 5]; track star) {
          <button 
            type="button"
            class="star-btn" 
            [class.filled]="(hoveredStar() !== null ? hoveredStar()! : value) >= star"
            (mouseenter)="onHover(star)"
            (click)="setValue(star)">
            <lucide-icon [img]="StarIcon" [size]="20" fill="currentColor"></lucide-icon>
          </button>
        }
        <!-- 6th Special Star -->
        <button 
          type="button"
          class="star-btn special-star" 
          [class.filled]="(hoveredStar() !== null ? hoveredStar()! : value) === 6"
          [class.visible]="hoveredStar() === 6 || value === 6"
          (mouseenter)="onHover(6)"
          (click)="setValue(6)">
          <lucide-icon [img]="StarIcon" [size]="20" fill="currentColor"></lucide-icon>
        </button>
      </div>
      <span class="score-label">{{ currentLabel() }}</span>
    </div>
  `,
  styles: [`
    .score-rating {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stars {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      background: var(--app-surface);
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--app-border);
    }

    .star-btn {
      background: none;
      border: none;
      padding: 0.125rem;
      color: var(--app-text-muted);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      &:hover {
        transform: scale(1.15);
      }

      &.filled {
        color: #fbbf24; // Amber for regular stars
        
        lucide-icon {
          fill: currentColor;
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.4));
        }
      }
    }

    .special-star {
      margin-left: 0.25rem;
      position: relative;
      opacity: 0.3;
      transform: scale(0.8);

      &.visible {
        opacity: 1;
        transform: scale(1);
      }

      &.filled {
        color: #a855f7; // Purple for special star
        
        lucide-icon {
          fill: currentColor;
          filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.5));
        }
      }

      &:hover {
        opacity: 1;
        transform: scale(1.15);
      }

      &::before {
        content: '';
        position: absolute;
        left: -0.25rem;
        top: 20%;
        bottom: 20%;
        width: 1px;
        background: var(--app-border);
      }
    }

    .score-label {
      font-size: 0.875rem;
      font-weight: 600;
      min-width: 80px;
      color: var(--app-text-secondary);
    }
  `]
})
export class StarRatingInputComponent {
  @Input() value: number = 0;
  @Output() valueChange = new EventEmitter<number>();
  
  readonly StarIcon = Star;
  hoveredStar = signal<number | null>(null);

  labels: Record<number, string> = {
    0: 'Unrated',
    1: 'Appalling',
    2: 'Bad',
    3: 'Average',
    4: 'Good',
    5: 'Excellent',
    6: 'Masterpiece'
  };

  onHover(star: number | null) {
    this.hoveredStar.set(star);
  }

  setValue(star: number) {
    // Toggle off if clicking same value
    if (this.value === star) {
      this.value = 0;
    } else {
      this.value = star;
    }
    this.valueChange.emit(this.value);
  }

  currentLabel = computed(() => {
    const current = this.hoveredStar() !== null ? this.hoveredStar()! : this.value;
    return this.labels[current] || 'Unrated';
  });

  constructor() {}

}
