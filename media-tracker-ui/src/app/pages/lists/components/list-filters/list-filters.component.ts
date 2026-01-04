import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, SortAsc, SortDesc, FunnelX } from 'lucide-angular';
import { SearchBarComponent } from '../../../../components/ui/search-bar/search-bar';
import { SelectComponent } from '../../../../components/ui/select/select';
import { FilterService } from '../../../../services/filter.service';
import { AnimeService } from '../../../../services/anime.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-filters',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SearchBarComponent, SelectComponent, FormsModule],
  templateUrl: './list-filters.component.html',
  styleUrl: './list-filters.component.scss'
})
export class ListFiltersComponent implements OnInit {
  private filterService = inject(FilterService);
  private animeService = inject(AnimeService);

  @Input() availableGenres: string[] = [];
  @Input() availableStudios: string[] = [];
  
  currentFilters = this.filterService.currentFilters;
  searchQuery = '';

  readonly SortAscIcon = SortAsc;
  readonly SortDescIcon = SortDesc;
  readonly FunnelXIcon = FunnelX;

  ngOnInit() {
    this.searchQuery = this.currentFilters().query || '';
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

  clearAllFilters() {
    this.searchQuery = '';
    this.filterService.resetFilters();
    this.animeService.triggerFilterUpdate();
  }

  getGenreOptions() {
    return this.availableGenres.map(g => ({ value: g, label: g }));
  }

  getStudioOptions() {
    return this.availableStudios.map(s => ({ value: s, label: s }));
  }

  getSortOptions() {
    return [
      { value: 'updated', label: 'Updated' },
      { value: 'title', label: 'Name' },
    ];
  }

  hasActiveFilters(): boolean {
    return this.filterService.hasActiveFilters();
  }
}
