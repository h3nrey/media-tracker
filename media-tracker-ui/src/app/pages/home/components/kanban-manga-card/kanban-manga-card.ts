import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule, Star, BookOpen } from 'lucide-angular';
import { MediaItem } from '../../../../models/media-type.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';

@Component({
  selector: 'app-kanban-manga-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgClass, KanbanCardComponent],
  templateUrl: './kanban-manga-card.html',
  styleUrl: './kanban-manga-card.scss'
})
export class KanbanMangaCard {
  @Input() manga!: MediaItem;
  @Input() isSelected = false;
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() delete = new EventEmitter<MediaItem>();
  @Output() increment = new EventEmitter<MediaItem>();
  @Output() complete = new EventEmitter<MediaItem>();
  @Output() addNewRun = new EventEmitter<MediaItem>();
  @Output() addLog = new EventEmitter<MediaItem>();
  @Output() mediaClick = new EventEmitter<{ media: MediaItem, event: MouseEvent }>();
  
  readonly StarIcon = Star;
  readonly BookOpenIcon = BookOpen;

  isCompleted(): boolean {
    if (!this.manga || !this.manga.progressTotal) return false;
    return (this.manga.progressCurrent || 0) >= this.manga.progressTotal;
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
