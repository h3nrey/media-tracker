import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../services/filter.service';
import { AnimeService } from '../../services/anime.service';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss'
})
export class FilterBarComponent implements OnInit {
  searchQuery = signal('');
  selectedGenres = signal<string[]>([]);
  releaseYear = signal<number | undefined>(undefined);
  watchedYear = signal<number | undefined>(undefined);
  
  availableGenres = signal<string[]>([]);
  showFilters = signal(false);

  constructor(
    private filterService: FilterService,
    private animeService: AnimeService
  ) {}

  async ngOnInit() {
    await this.loadAvailableGenres();
  }

  private async loadAvailableGenres() {
    this.animeService.getAllAnime$().subscribe((anime: Anime[]) => {
      const genresSet = new Set<string>();
      anime.forEach((a: Anime) => a.genres.forEach((g: string) => genresSet.add(g)));
      this.availableGenres.set(Array.from(genresSet).sort());
    });
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.filterService.updateSearchQuery(query);
  }

  toggleGenre(genre: string) {
    const current = this.selectedGenres();
    const updated = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    
    this.selectedGenres.set(updated);
    this.filterService.updateGenres(updated);
  }

  onReleaseYearChange(year: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    this.releaseYear.set(yearNum);
    this.filterService.updateReleaseYear(yearNum);
  }

  onWatchedYearChange(year: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    this.watchedYear.set(yearNum);
    this.filterService.updateWatchedYear(yearNum);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedGenres.set([]);
    this.releaseYear.set(undefined);
    this.watchedYear.set(undefined);
    this.filterService.resetFilters();
  }

  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  get hasActiveFilters(): boolean {
    return this.filterService.hasActiveFilters();
  }
}
