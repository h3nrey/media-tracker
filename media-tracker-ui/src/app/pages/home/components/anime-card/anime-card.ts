import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule, Star, MoreVertical, Edit2, Trash2, Plus } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule, DragDropModule, LucideAngularModule, NgClass],
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.scss'
})
export class AnimeCard {
  @Input() anime!: Anime;
  @Output() edit = new EventEmitter<Anime>();
  @Output() delete = new EventEmitter<Anime>();
  @Output() increment = new EventEmitter<Anime>();
  
  readonly StarIcon = Star;
  readonly MoreVerticalIcon = MoreVertical;
  readonly EditIcon = Edit2;
  readonly TrashIcon = Trash2;
  readonly PlusIcon = Plus;

  menuOpen = signal(false);

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  onEdit(event: Event) {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.edit.emit(this.anime);
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.delete.emit(this.anime);
  }

  onIncrement(event: Event) {
    event.stopPropagation();
    this.increment.emit(this.anime);
  }

  getScoreColorClass(score: number): string {
    if (score >= 1 && score <= 5) return 'score-red';
    if (score >= 6 && score <= 10) return 'score-pink';
    if (score === 11) return 'score-purple';
    return '';
  }
}
