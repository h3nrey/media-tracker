import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';
import { MediaItem } from '../../../../models/media-type.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';

@Component({
  selector: 'app-kanban-anime-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgClass, KanbanCardComponent],
  templateUrl: './kanban-anime-card.html',
  styleUrl: './kanban-anime-card.scss'
})
export class KanbanAnimeCard {
  @Input() anime!: MediaItem;
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() delete = new EventEmitter<MediaItem>();
  @Output() increment = new EventEmitter<MediaItem>();
  
  readonly StarIcon = Star;

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
