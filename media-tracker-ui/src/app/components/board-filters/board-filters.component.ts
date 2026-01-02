import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Settings, X, RotateCcw } from 'lucide-angular';
import { FilterService } from '../../services/filter.service';
import { AnimeService, AnimeFilterParams } from '../../services/anime.service';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-board-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './board-filters.component.html',
  styleUrl: './board-filters.component.scss'
})
export class BoardFiltersComponent implements OnInit {
  searchQuery = '';
  
  availableGenres = signal<string[]>([]);
  availableStudios = signal<string[]>([]);
  availableYears = signal<number[]>([]);
  
  currentFilters;

  // Lucide icons
  readonly SettingsIcon = Settings;
  readonly XIcon = X;
  readonly ResetIcon = RotateCcw;

  constructor(
    private filterService: FilterService,
    private animeService: AnimeService
  ) {
    this.currentFilters = this.filterService.currentFilters;
  }

  ngOnInit() {
    this.animeService.getAllAnime$().subscribe(all => {
      this.calculateOptions(all);
    });
  }

  private calculateOptions(all: Anime[]) {
    const genres = new Set<string>();
    const studios = new Set<string>();
    const years = new Set<number>();
    
    all.forEach(anime => {
        anime.genres?.forEach(g => genres.add(g));
        anime.studios?.forEach(s => studios.add(s));
        if (anime.releaseYear) years.add(anime.releaseYear);
    });
    
    this.availableGenres.set([...genres].sort());
    this.availableStudios.set([...studios].sort());
    this.availableYears.set([...years].sort((a, b) => b - a));
  }

  onSearchChange(query: string) {
    this.filterService.updateSearchQuery(query);
    this.animeService.triggerFilterUpdate();
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterService.updateSearchQuery('');
    this.animeService.triggerFilterUpdate();
  }
  
  onGenreSelect(event: Event) {
      const select = event.target as HTMLSelectElement;
      const val = select.value;
      if (val) {
          this.toggleGenre(val); // Adds it
          select.value = ''; // Reset to placeholder
      }
  }

  onStudioSelect(event: Event) {
      const select = event.target as HTMLSelectElement;
      const val = select.value;
      if (val) {
          this.toggleStudio(val);
          select.value = '';
      }
  }

  onYearSelect(event: Event) {
      const select = event.target as HTMLSelectElement;
      const val = parseInt(select.value, 10);
      if (!isNaN(val)) {
          this.selectYear(val);
          select.value = '';
      }
  }

  onSortSelect(event: Event) {
      const select = event.target as HTMLSelectElement;
      const val = select.value;
      const [by, order] = val.split('-');
      // Cast to valid types
      this.filterService.updateSort(by as any, order as any);
      this.animeService.triggerFilterUpdate();
  }

  toggleGenre(genre: string) {
      const genres = this.currentFilters().genres || [];
      if (genres.includes(genre)) {
          this.filterService.updateGenres(genres.filter(g => g !== genre));
      } else {
           this.filterService.updateGenres([...genres, genre]);
      }
      this.animeService.triggerFilterUpdate();
  }

  toggleStudio(studio: string) {
       const studios = this.currentFilters().studios || [];
       if (studios.includes(studio)) {
           this.filterService.updateStudios(studios.filter(s => s !== studio));
       } else {
            this.filterService.updateStudios([...studios, studio]);
       }
       this.animeService.triggerFilterUpdate();
  }

  selectYear(year: number) {
      if (year === this.currentFilters().year) {
           this.filterService.updateYear(undefined);
      } else {
           this.filterService.updateYear(year);
      }
      this.animeService.triggerFilterUpdate();
  }

  hasActiveFilters(): boolean {
    return this.filterService.hasActiveFilters();
  }

  getActiveFilterCount(): number {
    let count = 0;
    const f = this.currentFilters();
    if (f.query) count++;
    if (f.genres?.length) count += f.genres.length;
    if (f.studios?.length) count += f.studios.length;
    if (f.year) count++;
    return count;
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.filterService.resetFilters();
    this.animeService.triggerFilterUpdate();
  }
}
