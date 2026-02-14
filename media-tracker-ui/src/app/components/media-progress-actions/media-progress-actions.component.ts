import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, Minus, RotateCcw, CheckCheck } from 'lucide-angular';

@Component({
  selector: 'app-media-progress-actions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './media-progress-actions.component.html',
  styleUrl: './media-progress-actions.component.scss'
})
export class MediaProgressActionsComponent {
  // Inputs
  currentProgress = input.required<number>();
  totalProgress = input.required<number>();
  mediaType = input<'anime' | 'manga' | 'game' | 'movie'>('anime');

  // Outputs
  increment = output<void>();
  decrement = output<void>();
  complete = output<void>();
  reset = output<void>();

  // Icons
  readonly PlusIcon = Plus;
  readonly MinusIcon = Minus;
  readonly ResetIcon = RotateCcw;
  readonly CheckIcon = CheckCheck;

  // Computed
  progress = computed(() => {
    const total = this.totalProgress();
    if (!total) return 0;
    const current = this.currentProgress();
    return Math.min(100, Math.round((current / total) * 100));
  });

  progressLabel = computed(() => {
    const type = this.mediaType();
    if (type === 'anime') return 'Episódios';
    if (type === 'manga') return 'Capítulos';
    if (type === 'game') return 'Horas';
    return 'Progresso';
  });


  onIncrement() {
    this.increment.emit();
  }

  onDecrement() {
    this.decrement.emit();
  }

  onComplete() {
    this.complete.emit();
  }

  onReset() {
    this.reset.emit();
  }
}
