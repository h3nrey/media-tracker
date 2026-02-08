import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Settings, X, RotateCcw, SortAsc, SortDesc, FunnelX, LayoutGrid, List } from 'lucide-angular';
import { combineLatest } from 'rxjs';
import { FilterService } from '../../services/filter.service';
import { MediaService } from '../../services/media.service';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { ViewModeService } from '../../services/view-mode.service';
import { MediaItem } from '../../models/media-type.model';
import { SelectComponent } from '../ui/select/select';
import { SearchBarComponent } from '../ui/search-bar/search-bar';
import { TooltipDirective } from '../ui/tooltip/tooltip.directive';

@Component({
  selector: 'app-board-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectComponent, SearchBarComponent, TooltipDirective],
  templateUrl: './board-filters.component.html',
  styleUrl: './board-filters.component.scss'
})
export class BoardFiltersComponent implements OnInit {
  private filterService = inject(FilterService);
  private mediaService = inject(MediaService);
  private mediaTypeState = inject(MediaTypeStateService);
  private viewModeService = inject(ViewModeService);

  searchQuery = '';
  
  availableGenres = signal<string[]>([]);
  availableStudios = signal<string[]>([]);
  availableYears = signal<number[]>([]);
  availableActivityYears = signal<number[]>([]);
  
  currentFilters = this.filterService.currentFilters;
  viewMode = this.viewModeService.viewMode;

  // Lucide icons
  readonly SettingsIcon = Settings;
  readonly XIcon = X;
  readonly ResetIcon = RotateCcw;
  readonly SortAscIcon = SortAsc;
  readonly SortDescIcon = SortDesc;
  readonly FunnelXIcon = FunnelX;
  readonly LayoutGridIcon = LayoutGrid;
  readonly ListIcon = List;

  setViewMode(mode: 'kanban' | 'list') {
    this.viewModeService.setMode(mode);
  }

  ngOnInit() {
    combineLatest([
      this.mediaTypeState.getSelectedMediaType$(),
      this.mediaService.filterUpdate$
    ]).subscribe(async ([selectedType, _]) => {
      const all = await this.mediaService.getAllMedia(selectedType);
      
      const allActivityYears = this.getActivityYears(all);
      this.availableActivityYears.set(allActivityYears);

      const filteredByYear = this.mediaService.filterMediaList(all, { 
        activityYear: this.currentFilters().activityYear 
      });
      
      this.calculateOptions(filteredByYear);
    });
  }

  private getActivityYears(all: MediaItem[]): number[] {
    const activityYears = new Set<number>();
    all.forEach(item => {
      if (item.createdAt) {
        activityYears.add(new Date(item.createdAt).getFullYear());
      }
      item.activityDates?.forEach(d => {
        activityYears.add(new Date(d).getFullYear());
      });
      item.runs?.forEach(run => {
        if (run.startDate) {
          const startYear = new Date(run.startDate).getFullYear();
          if (!isNaN(startYear)) activityYears.add(startYear);
        }
        if (run.endDate) {
          const endYear = new Date(run.endDate).getFullYear();
          if (!isNaN(endYear)) activityYears.add(endYear);
        }
      });
    });
    return [...activityYears].sort((a, b) => b - a);
  }

  private calculateOptions(all: MediaItem[]) {
    const genres = new Set<string>();
    const studios = new Set<string>();
    const years = new Set<number>();
    
    all.forEach(item => {
        item.genres?.forEach(g => genres.add(g));
        item.studios?.forEach(s => studios.add(s));
        if (item.releaseYear) years.add(item.releaseYear);
    });
    
    this.availableGenres.set([...genres].sort());
    this.availableStudios.set([...studios].sort());
    this.availableYears.set([...years].sort((a, b) => b - a));
  }

  onSearchChange(query: string) {
    this.filterService.updateSearchQuery(query);
    this.mediaService.triggerFilterUpdate();
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterService.updateSearchQuery('');
    this.mediaService.triggerFilterUpdate();
  }
  
  onSortChange(sortBy: any) {
      this.filterService.updateSort(sortBy, this.currentFilters().sortOrder || 'desc');
      this.mediaService.triggerFilterUpdate();
  }

  toggleSortOrder() {
      const currentOrder = this.currentFilters().sortOrder || 'desc';
      const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
      this.filterService.updateSort(this.currentFilters().sortBy || 'updated', newOrder);
      this.mediaService.triggerFilterUpdate();
  }

  toggleGenre(genre: string) {
      const genres = this.currentFilters().genres || [];
      if (genres.includes(genre)) {
          this.filterService.updateGenres(genres.filter((g: string) => g !== genre));
      } else {
           this.filterService.updateGenres([...genres, genre]);
      }
      this.mediaService.triggerFilterUpdate();
  }

  toggleStudio(studio: string) {
       const studios = this.currentFilters().studios || [];
       if (studios.includes(studio)) {
           this.filterService.updateStudios(studios.filter((s: string) => s !== studio));
       } else {
            this.filterService.updateStudios([...studios, studio]);
       }
       this.mediaService.triggerFilterUpdate();
  }

  selectYear(year: number) {
      if (year === this.currentFilters().year) {
           this.filterService.updateYear(undefined);
      } else {
           this.filterService.updateYear(year);
      }
      this.mediaService.triggerFilterUpdate();
  }

  toggleActivityYear(year: number | undefined) {
    if (this.currentFilters().activityYear === year) {
        this.filterService.updateActivityYear(undefined);
    } else {
        this.filterService.updateActivityYear(year);
    }
    this.mediaService.triggerFilterUpdate();
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
    this.mediaService.triggerFilterUpdate();
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
    const years = this.availableActivityYears().map(y => ({ value: y, label: y.toString() }));
    return [
      { value: undefined, label: 'All Time' },
      ...years
    ];
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
