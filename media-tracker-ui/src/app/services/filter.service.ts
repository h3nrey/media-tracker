import { Injectable, signal, computed } from '@angular/core';
import { Anime } from '../models/anime.model';
import { MediaItem, MediaFilterParams } from '../models/media-type.model';
import { AnimeService } from './anime.service';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filters = signal<MediaFilterParams>({
    query: '',
    genres: [],
    studios: [],
    year: undefined,
    activityYear: undefined,
    sortBy: 'updated',
    sortOrder: 'desc'
  });

  readonly currentFilters = this.filters.asReadonly();

  constructor(
    private animeService: AnimeService,
    private mediaService: MediaService
  ) {}

  updateSearchQuery(query: string) {
    this.filters.update(f => ({ ...f, query }));
    this.mediaService.triggerFilterUpdate();
  }

  updateGenres(genres: string[]) {
    this.filters.update(f => ({ ...f, genres }));
    this.mediaService.triggerFilterUpdate();
  }

  updateStudios(studios: string[]) {
      this.filters.update(f => ({ ...f, studios }));
      this.mediaService.triggerFilterUpdate();
  }

  updateYear(year: number | undefined) {
    this.filters.update(f => ({ ...f, year }));
  }

  updateSort(sortBy: 'title' | 'score' | 'updated' | 'releaseYear', sortOrder: 'asc' | 'desc') {
      this.filters.update(f => ({ ...f, sortBy, sortOrder }));
      this.mediaService.triggerFilterUpdate();
  }

  resetFilters() {
    this.filters.set({
      query: '',
      genres: [],
      studios: [],
      year: undefined,
      activityYear: undefined,
      sortBy: 'updated',
      sortOrder: 'desc'
    });
    this.mediaService.triggerFilterUpdate();
  }

  updateActivityYear(activityYear: number | undefined) {
    this.filters.update(f => ({ ...f, activityYear }));
    this.mediaService.triggerFilterUpdate();
  }

  filterAnime(anime: Anime[]): Anime[] {
    return this.animeService.filterAnimeList(anime, this.filters() as any);
  }

  filterMedia(media: MediaItem[]): MediaItem[] {
    return this.mediaService.filterMediaList(media, this.filters());
  }

  hasActiveFilters(): boolean {
    const f = this.filters();
    return !!(
      (f.query && f.query.length > 0) ||
      (f.genres && f.genres.length > 0) ||
      (f.studios && f.studios.length > 0) ||
      f.year ||
      f.activityYear
    );
  }
}
