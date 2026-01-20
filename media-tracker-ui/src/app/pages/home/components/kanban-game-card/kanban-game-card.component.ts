import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';
import { MediaItem } from '../../../../models/media-type.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';

@Component({
  selector: 'app-kanban-game-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgClass, KanbanCardComponent],
  templateUrl: './kanban-game-card.html',
  styleUrl: './kanban-game-card.scss'
})
export class KanbanGameCard {
  @Input() game!: MediaItem;
  @Input() isSelected = false;
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() delete = new EventEmitter<MediaItem>();
  @Output() increment = new EventEmitter<MediaItem>();
  @Output() mediaClick = new EventEmitter<{ media: MediaItem, event: MouseEvent }>();
  
  readonly StarIcon = Star;

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
