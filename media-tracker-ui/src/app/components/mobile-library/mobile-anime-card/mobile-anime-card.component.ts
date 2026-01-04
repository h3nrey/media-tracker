import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star, MoreVertical, Edit2, Trash2 } from 'lucide-angular';
import { Anime } from '../../../models/anime.model';
import { Category } from '../../../models/status.model';

@Component({
  selector: 'app-mobile-anime-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './mobile-anime-card.component.html',
  styleUrl: './mobile-anime-card.component.scss'
})
export class MobileAnimeCardComponent {
  @Input() anime!: Anime;
  @Input() categories: Category[] = [];
  @Output() edit = new EventEmitter<Anime>();
  @Output() delete = new EventEmitter<Anime>();
  @Output() move = new EventEmitter<{anime: Anime, categoryId: number}>();
  
  readonly StarIcon = Star;
  readonly MoreVerticalIcon = MoreVertical;
  readonly EditIcon = Edit2;
  readonly TrashIcon = Trash2;

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

  onMove(event: Event, categoryId: number) {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.move.emit({anime: this.anime, categoryId});
  }
}
