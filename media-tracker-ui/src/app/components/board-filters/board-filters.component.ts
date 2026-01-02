import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Settings, X } from 'lucide-angular';
import { FilterService } from '../../services/filter.service';
import { AnimeService } from '../../services/anime.service';

@Component({
  selector: 'app-board-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './board-filters.component.html',
  styleUrl: './board-filters.component.scss'
})
export class BoardFiltersComponent {
  searchQuery = '';
  releaseYear: number | undefined;
  watchedYear: number | undefined;
  showFilters = signal(false);

  // Lucide icons
  readonly SettingsIcon = Settings;
  readonly XIcon = X;

  constructor(
    private filterService: FilterService,
    private animeService: AnimeService
  ) {}

  onSearchChange(query: string) {
    this.filterService.updateSearchQuery(query);
    this.animeService.triggerFilterUpdate();
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterService.updateSearchQuery('');
    this.animeService.triggerFilterUpdate();
  }

  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  onReleaseYearChange(year: number | undefined) {
    this.filterService.updateReleaseYear(year);
    this.animeService.triggerFilterUpdate();
  }

  onWatchedYearChange(year: number | undefined) {
    this.filterService.updateWatchedYear(year);
    this.animeService.triggerFilterUpdate();
  }

  hasActiveFilters(): boolean {
    return this.filterService.hasActiveFilters();
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.releaseYear) count++;
    if (this.watchedYear) count++;
    return count;
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.releaseYear = undefined;
    this.watchedYear = undefined;
    this.filterService.resetFilters();
    this.animeService.triggerFilterUpdate();
  }
}
