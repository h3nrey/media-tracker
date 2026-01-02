import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeFilterParams } from '../../../services/anime.service';
import { LucideAngularModule, X, RotateCcw } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mobile-filter-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './mobile-filter-drawer.component.html',
  styleUrl: './mobile-filter-drawer.component.scss'
})
export class MobileFilterDrawerComponent {
  @Input() open = false;
  @Input() availableGenres: string[] = [];
  @Input() availableStudios: string[] = [];
  @Input() availableYears: number[] = [];
  @Input() currentFilters: AnimeFilterParams = {};
  
  @Output() close = new EventEmitter<void>();
  @Output() update = new EventEmitter<AnimeFilterParams>();
  @Output() reset = new EventEmitter<void>();

  readonly XIcon = X;
  readonly ResetIcon = RotateCcw;

  updateSort(by: 'title' | 'score' | 'updated' | 'releaseYear') {
      const current = this.currentFilters.sortBy || 'updated';
      let order = this.currentFilters.sortOrder || 'desc';
      
      if (current === by) {
          order = order === 'asc' ? 'desc' : 'asc';
      } else {
          order = 'desc';
          if (by === 'title') order = 'asc';
      }
      
      this.emitUpdate({ ...this.currentFilters, sortBy: by, sortOrder: order });
  }

  toggleGenre(genre: string) {
      const genres = this.currentFilters.genres || [];
      if (genres.includes(genre)) {
          this.emitUpdate({ ...this.currentFilters, genres: genres.filter((g: string) => g !== genre) });
      } else {
          this.emitUpdate({ ...this.currentFilters, genres: [...genres, genre] });
      }
  }

  toggleStudio(studio: string) {
      const studios = this.currentFilters.studios || [];
      if (studios.includes(studio)) {
          this.emitUpdate({ ...this.currentFilters, studios: studios.filter((s: string) => s !== studio) });
      } else {
          this.emitUpdate({ ...this.currentFilters, studios: [...studios, studio] });
      }
  }

  selectYear(year: number | null) {
      if (year === this.currentFilters.year) {
          this.emitUpdate({ ...this.currentFilters, year: undefined });
      } else {
          this.emitUpdate({ ...this.currentFilters, year: year || undefined });
      }
  }

  emitUpdate(params: AnimeFilterParams) {
      this.update.emit(params);
  }

  onReset() {
      this.reset.emit();
  }
}
