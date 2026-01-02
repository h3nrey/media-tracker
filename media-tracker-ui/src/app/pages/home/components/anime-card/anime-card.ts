import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule, Star, MoreVertical, Edit2, Trash2, Plus, Play } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';
import { WatchSourceService } from '../../../../services/watch-source.service';
import { getScoreColorClass } from '../../../../utils/anime-utils';

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
  readonly PlayIcon = Play;

  menuOpen = signal(false);
  hasSources = signal(false);

  constructor(private watchSourceService: WatchSourceService) {}

  ngOnInit() {
    this.checkSources();
  }

  async checkSources() {
    if (this.anime.watchLinks && this.anime.watchLinks.length > 0) {
      this.hasSources.set(true);
      return;
    }

    const globalSources = await this.watchSourceService.getAllSources();
    this.hasSources.set(globalSources.length > 0);
  }

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

  async playFirstSource(event: Event) {
    event.stopPropagation();
    
    if (this.anime.watchLinks && this.anime.watchLinks.length > 0) {
      window.open(this.anime.watchLinks[0].url, '_blank');
      return;
    }

    const globalSources = await this.watchSourceService.getAllSources();
    if (globalSources.length > 0) {
      const source = globalSources[0];
      if (source.baseUrl) {
        const url = source.baseUrl + encodeURIComponent(this.anime.title);
        window.open(url, '_blank');
      }
    }
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
