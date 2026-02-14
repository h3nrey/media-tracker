import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, from, switchMap } from 'rxjs';
import { MediaItem, MediaType, MediaFilterParams } from '../models/media-type.model';
import { Category } from '../models/status.model';
import { MediaService } from './media.service';
import { Anime } from '../models/anime.model';

export interface AnimeByCategory {
  category: Category;
  anime: MediaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private mediaService = inject(MediaService);
  public filterUpdate$ = this.mediaService.filterUpdate$;
  public metadataSyncRequested = signal(false);

  constructor() {}

  triggerFilterUpdate() {
    this.mediaService.triggerFilterUpdate();
  }

  getAllAnime$(): Observable<Anime[]> {
    return this.mediaService.getAllMedia$(MediaType.ANIME).pipe(
      map(items => items.map(item => this.mapToAnime(item)))
    );
  }

  private mapToAnime(item: MediaItem): Anime {
    return {
      ...item,
      mediaItemId: item.id!,
      studios: item.studios || [],
      malId: item.externalApi === 'mal' ? Number(item.externalId) : undefined
    } as Anime;
  }

  getAnimeByStatus$(statusId: number): Observable<MediaItem[]> {
    return this.getAllAnime$().pipe(
      map(items => items.filter(item => item.statusId === statusId))
    );
  }

  getAnimeGroupedByCategory$(categories: Category[]): Observable<AnimeByCategory[]> {
    return this.getAllAnime$().pipe(
      map(allAnime => 
        categories.map(category => ({
          category,
          anime: allAnime.filter(anime => anime.statusId === (category.supabaseId || category.id))
        }))
      )
    );
  }

  getFilteredAnimeGroupedByCategory$(
    categories: Category[],
    filterFn: (anime: MediaItem[]) => MediaItem[]
  ): Observable<AnimeByCategory[]> {
    return combineLatest([
      this.getAllAnime$(),
      this.filterUpdate$
    ]).pipe(
      map(([allAnime]) => {
        const filteredAnime = filterFn(allAnime);
        return categories.map(category => ({
          category,
          anime: filteredAnime.filter(anime => anime.statusId === (category.supabaseId || category.id))
        }));
      })
    );
  }

  async getAnimeById(id: number): Promise<Anime | undefined> {
    const item = await this.mediaService.getMediaById(id);
    if (!item || item.mediaTypeId !== MediaType.ANIME) return undefined;
    return this.mapToAnime(item);
  }

  getAnimeById$(id: number): Observable<Anime | undefined> {
    return from(this.getAnimeById(id));
  }

  async getAnimeBySupabaseId(supabaseId: number): Promise<Anime | undefined> {
    const item = await this.mediaService.getMediaById(supabaseId);
    if (!item || item.mediaTypeId !== MediaType.ANIME) return undefined;
    return this.mapToAnime(item);
  }

  getAnimeByExternalId(externalId: number): Observable<MediaItem | undefined> {
    return from(this.mediaService.getMediaByExternalId(externalId, 'mal')).pipe(
      map(item => item ? this.mapToAnime(item) : undefined)
    );
  }

  async addAnime(anime: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return this.mediaService.addMedia({
      ...anime,
      mediaTypeId: MediaType.ANIME
    });
  }

  async updateAnime(id: number, updates: Partial<MediaItem>): Promise<number> {
    return this.mediaService.updateMedia(id, updates);
  }

  async updateAnimeStatus(id: number, statusId: number): Promise<number> {
    return this.mediaService.updateMedia(id, { statusId });
  }

  async deleteAnime(id: number): Promise<void> {
    await this.mediaService.deleteMedia(id);
  }

  async searchAnimeByTitle(query: string): Promise<MediaItem[]> {
    const all = await this.mediaService.getAllMedia(MediaType.ANIME);
    const q = query.toLowerCase();
    return all.filter(a => a.title.toLowerCase().includes(q));
  }

  async getAnimeCountByStatus(statusId: number): Promise<number> {
    const all = await this.mediaService.getAllMedia(MediaType.ANIME);
    return all.filter(a => a.statusId === statusId).length;
  }

  filterAnimeList(list: Anime[], params: MediaFilterParams): Anime[] {
    let result = [...list];

    // Text Search
    if (params.query) {
      const q = params.query.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(q));
    }

    // Genres
    if (params.genres && params.genres.length > 0) {
      result = result.filter(a => a.genres && params.genres!.every((g: string) => a.genres.includes(g)));
    }

    // Studios
    if (params.studios && params.studios.length > 0) {
      result = result.filter(a => a.studios && params.studios!.some((s: string) => a.studios?.includes(s)));
    }

    // Year
    if (params.year) {
      result = result.filter(a => a.releaseYear === params.year);
    }

    // Activity Year Filtering
    if (params.activityYear) {
      const targetYear = params.activityYear;
      result = result.filter(a => {
        const createdDate = a.createdAt ? new Date(a.createdAt) : null;
        const addedInYear = createdDate && createdDate.getFullYear() === targetYear;
        
        const hasActivityDates = a.activityDates && a.activityDates.length > 0;
        const hasRuns = a.runs && a.runs.length > 0;

        if (!hasActivityDates && !hasRuns) {
          return !!addedInYear;
        }

        const watchedInYearByDate = a.activityDates?.some(d => {
          const dDate = new Date(d);
          return dDate.getFullYear() === targetYear;
        }) || false;

        const watchedInYearByRun = a.runs?.some(run => {
          const startYear = run.startDate ? new Date(run.startDate).getFullYear() : null;
          const endYear = run.endDate ? new Date(run.endDate).getFullYear() : null;
          return startYear === targetYear || endYear === targetYear;
        }) || false;
        
        return watchedInYearByDate || watchedInYearByRun;
      });
    }

    // Sort
    if (params.sortBy) {
      const mult = params.sortOrder === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        let valA: any = a[params.sortBy as keyof MediaItem];
        let valB: any = b[params.sortBy as keyof MediaItem];
        
        if (params.sortBy === 'updated') {
            valA = new Date(a.updatedAt || 0).getTime();
            valB = new Date(b.updatedAt || 0).getTime();
        } else if (params.sortBy === 'title') {
            return a.title.localeCompare(b.title) * mult;
        }

        if (valA < valB) return -1 * mult;
        if (valA > valB) return 1 * mult;
        return 0;
      });
    }

    return result;
  }
}
