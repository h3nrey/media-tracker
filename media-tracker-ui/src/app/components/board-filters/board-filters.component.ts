import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Settings, X, RotateCcw, SortAsc, SortDesc, FunnelX } from 'lucide-angular';
import { combineLatest } from 'rxjs';
import { FilterService } from '../../services/filter.service';
import { AnimeService } from '../../services/anime.service';
import { Anime, AnimeFilterParams } from '../../models/anime.model';
import { SelectComponent } from '../ui/select/select';
import { SearchBarComponent } from '../ui/search-bar/search-bar';

@Component({
  selector: 'app-board-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectComponent, SearchBarComponent],
  templateUrl: './board-filters.component.html',
  styleUrl: './board-filters.component.scss'
})
export class BoardFiltersComponent implements OnInit {
  searchQuery = '';
  
  availableGenres = signal<string[]>([]);
  availableStudios = signal<string[]>([]);
  availableYears = signal<number[]>([]);
  availableActivityYears = signal<number[]>([]);
  
  currentFilters;

  // Lucide icons
  readonly SettingsIcon = Settings;
  readonly XIcon = X;
  readonly ResetIcon = RotateCcw;
  readonly SortAscIcon = SortAsc;
  readonly SortDescIcon = SortDesc;
  readonly FunnelXIcon = FunnelX;

  constructor(
    private filterService: FilterService,
    private animeService: AnimeService
  ) {
    this.currentFilters = this.filterService.currentFilters;
  }

  ngOnInit() {
    combineLatest([
      this.animeService.getAllAnime$(),
      this.animeService.filterUpdate$
    ]).subscribe(([all]: [Anime[], number]) => {
      // Always calculate all available activity years once or from the full list
      const allActivityYears = this.getActivityYears(all);
      this.availableActivityYears.set(allActivityYears);

      // Filter list by activity year for other options
      const filteredByYear = this.animeService.filterAnimeList(all, { 
        activityYear: this.currentFilters().activityYear 
      });
      
      this.calculateOptions(filteredByYear);
    });
  }

  private getActivityYears(all: Anime[]): number[] {
    const activityYears = new Set<number>();
    all.forEach(anime => {
      if (anime.createdAt) {
        activityYears.add(new Date(anime.createdAt).getFullYear());
      }
      anime.watchDates?.forEach(d => {
        activityYears.add(new Date(d).getFullYear());
      });
    });
    return [...activityYears].sort((a, b) => b - a);
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
  
  onSortChange(sortBy: any) {
      this.filterService.updateSort(sortBy, this.currentFilters().sortOrder || 'desc');
      this.animeService.triggerFilterUpdate();
  }

  toggleSortOrder() {
      const currentOrder = this.currentFilters().sortOrder || 'desc';
      const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
      this.filterService.updateSort(this.currentFilters().sortBy || 'updated', newOrder);
      this.animeService.triggerFilterUpdate();
  }

  toggleGenre(genre: string) {
      const genres = this.currentFilters().genres || [];
      if (genres.includes(genre)) {
          this.filterService.updateGenres(genres.filter((g: string) => g !== genre));
      } else {
           this.filterService.updateGenres([...genres, genre]);
      }
      this.animeService.triggerFilterUpdate();
  }

  toggleStudio(studio: string) {
       const studios = this.currentFilters().studios || [];
       if (studios.includes(studio)) {
           this.filterService.updateStudios(studios.filter((s: string) => s !== studio));
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

  toggleActivityYear(year: number | undefined) {
    if (this.currentFilters().activityYear === year) {
        this.filterService.updateActivityYear(undefined);
    } else {
        this.filterService.updateActivityYear(year);
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
    if (f.activityYear) count++;
    return count;
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.filterService.resetFilters();
    this.animeService.triggerFilterUpdate();
  }

  getGenreOptions() {
    return this.availableGenres().map(g => ({ value: g, label: g }));
  }

  getStudioOptions() {
    return this.availableStudios().map(s => ({ value: s, label: s }));
  }

  getReleaseYearOptions() {
    return this.availableYears().map(y => ({ value: y, label: y.toString() }));
  }

  getWatchedYearOptions() {
    return this.availableActivityYears().map(y => ({ value: y, label: y.toString() }));
  }

  getSortOptions() {
    return [
      { value: 'updated', label: 'Updated' },
      { value: 'title', label: 'Title' },
      { value: 'score', label: 'Score' },
      { value: 'releaseYear', label: 'Release' },
    ];
  }
}
