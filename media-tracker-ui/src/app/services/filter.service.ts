import { Injectable, signal, computed } from '@angular/core';
import { Anime } from '../models/anime.model';

export interface AnimeFilters {
  searchQuery: string;
  genres: string[];
  releaseYear?: number;
  watchedYear?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filters = signal<AnimeFilters>({
    searchQuery: '',
    genres: [],
    releaseYear: undefined,
    watchedYear: undefined
  });

  readonly currentFilters = this.filters.asReadonly();

  updateSearchQuery(query: string) {
    this.filters.update(f => ({ ...f, searchQuery: query }));
  }

  updateGenres(genres: string[]) {
    this.filters.update(f => ({ ...f, genres }));
  }

  updateReleaseYear(year: number | undefined) {
    this.filters.update(f => ({ ...f, releaseYear: year }));
  }

  updateWatchedYear(year: number | undefined) {
    this.filters.update(f => ({ ...f, watchedYear: year }));
  }

  resetFilters() {
    this.filters.set({
      searchQuery: '',
      genres: [],
      releaseYear: undefined,
      watchedYear: undefined
    });
  }

  filterAnime(anime: Anime[]): Anime[] {
    const filters = this.filters();
    
    return anime.filter(item => {
      if (filters.searchQuery && !item.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      if (filters.genres.length > 0) {
        const hasMatchingGenre = filters.genres.some(filterGenre => 
          item.genres.some(animeGenre => 
            animeGenre.toLowerCase().includes(filterGenre.toLowerCase())
          )
        );
        if (!hasMatchingGenre) return false;
      }

      if (filters.releaseYear && item.releaseYear !== filters.releaseYear) {
        return false;
      }

      if (filters.watchedYear) {
        const watchedYear = item.updatedAt ? new Date(item.updatedAt).getFullYear() : undefined;
        if (watchedYear !== filters.watchedYear) {
          return false;
        }
      }

      return true;
    });
  }

  hasActiveFilters(): boolean {
    const filters = this.filters();
    return !!(
      filters.searchQuery ||
      filters.genres.length > 0 ||
      filters.releaseYear ||
      filters.watchedYear
    );
  }
}
