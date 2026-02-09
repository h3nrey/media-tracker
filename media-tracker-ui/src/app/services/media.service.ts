import { Injectable, inject, signal } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, BehaviorSubject, combineLatest, map } from 'rxjs';
import { MediaItem, MediaFilterParams, MediaType, MediaGalleryImage } from '../models/media-type.model';
import { Category } from '../models/status.model';
import { db } from './database.service';
import { SyncService } from './sync.service';
import { AnimeMetadata } from '../models/anime-metadata.model';
import { MangaMetadata } from '../models/manga-metadata.model';
import { GameMetadata } from '../models/game-metadata.model';
import { MovieMetadata } from '../models/movie-metadata.model';
import { MalService } from './mal.service';
import { IgdbService, IGDBGame } from './igdb.service';
import { TmdbService } from './tmdb.service';
import { Router } from '@angular/router';
import { CategoryService } from './status.service';
import { JikanAnime } from '../models/mal-anime.model';
import { ReviewService } from './review.service';
import { of, catchError, combineLatest as combineLatestRxjs, switchMap, firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface MediaByCategory {
  category: Category;
  media: MediaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private syncService = inject(SyncService);
  private malService = inject(MalService);
  private igdbService = inject(IgdbService);
  private tmdbService = inject(TmdbService);
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  private reviewService = inject(ReviewService);
  private supabaseService = inject(SupabaseService);

  public filterUpdate$ = new BehaviorSubject<number>(0);
  public metadataSyncRequested = signal(false);

  constructor() {}

  triggerFilterUpdate() {
    this.filterUpdate$.next(Date.now());
  }

  getAllMedia$(mediaTypeId?: number | null): Observable<MediaItem[]> {
    return from(liveQuery(async () => {
      let items;
      if (mediaTypeId) {
        items = await db.mediaItems.where('mediaTypeId').equals(mediaTypeId).toArray();
      } else {
        items = await db.mediaItems.toArray();
      }
      
      const filtered = items.filter(m => !m.isDeleted);
      
      return Promise.all(filtered.map(async item => {
        const runs = await db.mediaRuns.where('mediaItemId').equals(item.id!).toArray();
        const screenshots = await db.mediaImages.where('mediaItemId').equals(item.id!).toArray();
        return { 
          ...item, 
          runs: runs.filter(r => !r.isDeleted),
          screenshots: screenshots.filter(s => !s.isDeleted)
        };
      }));
    })).pipe(
      switchMap(items => {
        const supabaseIds = items.map(m => m.supabaseId).filter((id): id is number => !!id);
        if (supabaseIds.length === 0) return of(items);
        
        return this.reviewService.getReviewsForMediaList$(supabaseIds).pipe(
          map(reviews => items.map(item => ({
            ...item,
            reviews: reviews.filter(r => r.media_item_id === item.supabaseId)
          }))),
          catchError(() => of(items))
        );
      })
    );
  }

  async getAllMedia(mediaTypeId?: number | null): Promise<MediaItem[]> {
    let items;
    if (mediaTypeId) {
      items = await db.mediaItems.where('mediaTypeId').equals(mediaTypeId).toArray();
    } else {
      items = await db.mediaItems.toArray();
    }
    
    const filtered = items.filter(m => !m.isDeleted);
    
    const mediaItems = await Promise.all(filtered.map(async item => {
      const runs = await db.mediaRuns.where('mediaItemId').equals(item.id!).toArray();
      const screenshots = await db.mediaImages.where('mediaItemId').equals(item.id!).toArray();
      return {
        ...item,
        runs: runs.filter(r => !r.isDeleted),
        screenshots: screenshots.filter(s => !s.isDeleted)
      };
    }));

    const supabaseIds = mediaItems.map(m => m.supabaseId).filter((id): id is number => !!id);
    if (supabaseIds.length === 0) return mediaItems;

    try {
      const reviews = await firstValueFrom(this.reviewService.getReviewsForMediaList$(supabaseIds));
      return mediaItems.map(item => ({
        ...item,
        reviews: reviews.filter(r => r.media_item_id === item.supabaseId)
      }));
    } catch {
      return mediaItems;
    }
  }

  getMediaByStatus$(statusId: number, mediaTypeId?: number | null): Observable<MediaItem[]> {
    return from(liveQuery(async () => {
      let query = db.mediaItems.where('statusId').equals(statusId);
      let items = await query.toArray();
      if (mediaTypeId) {
        items = items.filter(m => m.mediaTypeId === mediaTypeId);
      }
      
      const filtered = items.filter(m => !m.isDeleted);
      
      return Promise.all(filtered.map(async item => {
        const runs = await db.mediaRuns.where('mediaItemId').equals(item.id!).toArray();
        const screenshots = await db.mediaImages.where('mediaItemId').equals(item.id!).toArray();
        return {
          ...item,
          runs: runs.filter(r => !r.isDeleted),
          screenshots: screenshots.filter(s => !s.isDeleted)
        };
      }));
    }));
  }

  getMediaGroupedByCategory$(categories: Category[], mediaTypeId?: number | null): Observable<MediaByCategory[]> {
    return this.getAllMedia$(mediaTypeId).pipe(
      map(allMedia => 
        categories.map(category => ({
          category,
          media: allMedia.filter(m => m.statusId === category.id)
        }))
      )
    );
  }

  getFilteredMediaGroupedByCategory$(
    categories: Category[],
    filterFn: (media: MediaItem[]) => MediaItem[],
    mediaTypeId?: number | null
  ): Observable<MediaByCategory[]> {
    return combineLatest([
      this.getAllMedia$(mediaTypeId),
      this.filterUpdate$
    ]).pipe(
      map(([allMedia]) => {
        const filteredMedia = filterFn(allMedia);
        return categories.map(category => ({
          category,
          media: filteredMedia.filter(m => m.statusId === category.id)
        }));
      })
    );
  }

  async getMediaById(id: number): Promise<MediaItem | undefined> {
    const item = await db.mediaItems.get(id);
    if (!item) return undefined;
    
    const runs = await db.mediaRuns.where('mediaItemId').equals(id).toArray();
    const screenshots = await db.mediaImages.where('mediaItemId').equals(id).toArray();
    return { 
      ...item, 
      runs: runs.filter(r => !r.isDeleted),
      screenshots: screenshots.filter(s => !s.isDeleted)
    };
  }

  getMediaById$(id: number): Observable<MediaItem | undefined> {
    return from(liveQuery(() => this.getMediaById(id)));
  }

  async getMediaBySupabaseId(supabaseId: number): Promise<MediaItem | undefined> {
    const item = await db.mediaItems.where('supabaseId').equals(supabaseId).first();
    if (!item) return undefined;
    return this.getMediaById(item.id!);
  }

  async getMediaByExternalId(externalId: number, externalApi: string): Promise<MediaItem | undefined> {
    const item = await db.mediaItems
      .where('externalId')
      .equals(externalId)
      .and(item => item.externalApi === externalApi && !item.isDeleted)
      .first();
    if (!item) return undefined;
    return this.getMediaById(item.id!);
  }


  async addMedia(media: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const { runs, screenshots, ...rest } = media;

    // Safety check: prevent duplicates by externalId
    if (rest.externalId && rest.externalApi) {
      const existing = await db.mediaItems
        .where('externalId').equals(rest.externalId)
        .and(m => m.externalApi === rest.externalApi && !m.isDeleted)
        .first();
      if (existing) return existing.id!;
    }
    
    const id = await db.mediaItems.add({
      ...rest,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    } as MediaItem);
    
    if (runs && runs.length > 0) {
      const runsToAdd = runs.map(run => ({
        ...run,
        mediaItemId: id as number,
        createdAt: now,
        updatedAt: now,
        isDeleted: false
      }));
      await db.mediaRuns.bulkAdd(runsToAdd);
    }

    if (screenshots && screenshots.length > 0) {
      const imagesToAdd = screenshots.map((img: MediaGalleryImage) => ({
        ...img,
        mediaItemId: id as number,
        createdAt: now,
        updatedAt: now,
        isDeleted: false
      }));
      await db.mediaImages.bulkAdd(imagesToAdd);
    }
    
    console.log("generated id: ", id);
    this.triggerFilterUpdate();
    this.syncService.sync();  
    return id as number;
  }

  async updateMedia(id: number, updates: Partial<MediaItem>): Promise<number> {
    const now = new Date();
    const { runs, screenshots, ...rest } = updates;

    const result = await db.mediaItems.update(id, {
      ...rest,
      updatedAt: now
    });

    if (runs) {
      await db.mediaRuns.where('mediaItemId').equals(id).delete();
      if (runs.length > 0) {
        const runsToAdd = runs.map(run => ({
          ...run,
          mediaItemId: id,
          createdAt: run.createdAt || now,
          updatedAt: now,
          isDeleted: false
        }));
        await db.mediaRuns.bulkAdd(runsToAdd);
      }
    }

    if (screenshots) {
      // For screenshots, we can do clear and replace within the same mediaItemId
      // This is simpler for local state management in forms
      await db.mediaImages.where('mediaItemId').equals(id).delete();
      if (screenshots.length > 0) {
        const imagesToAdd = screenshots.map((img: MediaGalleryImage) => ({
          ...img,
          mediaItemId: id,
          createdAt: img.createdAt || now,
          updatedAt: now,
          isDeleted: false
        }));
        await db.mediaImages.bulkAdd(imagesToAdd);
      }
    }

    this.triggerFilterUpdate();
    this.syncService.sync();
    return result;
  }

  async updateMediaStatus(id: number, statusId: number): Promise<number> {
    console.log("updateMediaStatus", id, statusId);
    const result = await db.mediaItems.update(id, {
      statusId,
      updatedAt: new Date()
    });
    this.triggerFilterUpdate();
    this.syncService.sync();
    return result;
  }

  async updateMediaStatusWithSync(id: number, localCategoryId: number): Promise<number> {
    const now = new Date();
    
    const result = await db.mediaItems.update(id, {
      statusId: localCategoryId,
      updatedAt: now
    });

    const mediaItem = await db.mediaItems.get(id);
    if (!mediaItem?.supabaseId) {
      console.warn('Media item has no supabaseId, skipping remote update');
      return result;
    }

    const category = await db.categories.get(localCategoryId);
    if (!category?.supabaseId) {
      console.warn(`Category ${localCategoryId} has no supabaseId, skipping remote update`);
      return result;
    }

    try {
      await this.supabaseService.client
        .from('media_items')
        .update({
          status_id: category.supabaseId,
          updated_at: now.toISOString()
        })
        .eq('id', mediaItem.supabaseId);
      
      console.log(`✅ Updated media ${mediaItem.title} category to ${category.name} on Supabase`);
      
      await db.mediaItems.update(id, { lastSyncedAt: now });
    } catch (error) {
      console.error('Failed to update Supabase:', error);
      this.syncService.sync();
    }

    return result;
  }

  async deleteMedia(id: number): Promise<void> {
    await db.mediaItems.update(id, {
      isDeleted: true,
      updatedAt: new Date()
    });
    this.syncService.sync();
  }

  // Metadata operations
  async getAnimeMetadata(mediaItemId: number): Promise<AnimeMetadata | undefined> {
    return await db.animeMetadata.get(mediaItemId);
  }

  async getMangaMetadata(mediaItemId: number): Promise<MangaMetadata | undefined> {
    return await db.mangaMetadata.get(mediaItemId);
  }

  async getGameMetadata(mediaItemId: number): Promise<GameMetadata | undefined> {
    return await db.gameMetadata.get(mediaItemId);
  }

  async getMovieMetadata(mediaItemId: number): Promise<MovieMetadata | undefined> {
    return await db.movieMetadata.get(mediaItemId);
  }

  async saveAnimeMetadata(metadata: AnimeMetadata): Promise<void> {
    await db.animeMetadata.put(metadata);
    this.syncService.sync();
  }

  async saveMangaMetadata(metadata: MangaMetadata): Promise<void> {
    await db.mangaMetadata.put(metadata);
    this.syncService.sync();
  }

  async saveGameMetadata(metadata: GameMetadata): Promise<void> {
    await db.gameMetadata.put(metadata);
    this.syncService.sync();
  }

  async saveMovieMetadata(metadata: MovieMetadata): Promise<void> {
    await db.movieMetadata.put(metadata);
    this.syncService.sync();
  }

  filterMediaList(list: MediaItem[], params: MediaFilterParams): MediaItem[] {
    let result = [...list];

    if (params.query) {
      const q = params.query.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(q));
    }

    if (params.genres && params.genres.length > 0) {
      result = result.filter(m => m.genres && params.genres!.every((g: string) => m.genres.includes(g)));
    }

    if (params.studios && params.studios.length > 0) {
      result = result.filter(m => m.studios && params.studios!.some((s: string) => m.studios?.includes(s)));
    }

    if (params.year) {
      result = result.filter(m => m.releaseYear === params.year);
    }

    if (params.activityYear) {
      const targetYear = params.activityYear;
      result = result.filter(m => {
        const createdDate = m.createdAt ? new Date(m.createdAt) : null;
        const addedInYear = createdDate && createdDate.getFullYear() === targetYear;
        
        const hasActivityDates = m.activityDates && m.activityDates.length > 0;
        const hasRuns = m.runs && m.runs.length > 0;

        if (!hasActivityDates && !hasRuns) {
          return !!addedInYear;
        }

        const activeInYearByDate = m.activityDates?.some(d => {
          const dDate = new Date(d);
          return dDate.getFullYear() === targetYear;
        }) || false;

        const activeInYearByRun = m.runs?.some(run => {
          const startYear = run.startDate ? new Date(run.startDate).getFullYear() : null;
          const endYear = run.endDate ? new Date(run.endDate).getFullYear() : null;
          return startYear === targetYear || endYear === targetYear;
        }) || false;
        
        return activeInYearByDate || activeInYearByRun;
      });
    }

    if (params.sortBy) {
      const mult = params.sortOrder === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        let valA: any = a[params.sortBy as keyof MediaItem];
        let valB: any = b[params.sortBy as keyof MediaItem];
        
        if (params.sortBy === ('updated' as any)) { // Casting since 'updated' is not in model keys directly usually
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

  getCompletedMedia(list: MediaItem[], year?: number): MediaItem[] {
    const getEffectiveCompletionDate = (item: MediaItem): Date | null => {
      if (item.endDate) {
        const d = new Date(item.endDate);
        return isNaN(d.getTime()) ? null : d;
      }
      if (item.runs && item.runs.length > 0) {
        const lastRun = item.runs.sort((a: any, b: any) => 
          new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime()
        )[0];
        if (lastRun?.endDate) {
          const d = new Date(lastRun.endDate);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      return null;
    };

    const completedWithDates = (list || [])
      .map(item => ({ item, date: getEffectiveCompletionDate(item) }))
      .filter(({ date }) => {
        if (!date) return false;
        if (!year) return true;
        return date.getFullYear() === year;
      });

    // Sort descending by completion date
    completedWithDates.sort((a, b) => b.date!.getTime() - a.date!.getTime());

    return completedWithDates.map(c => c.item);
  }

  async importMediaFromApi(apiItem: any): Promise<number> {
    const categories = await this.categoryService.getAllCategories();
    const backlogCat = categories.find(c => 
      c.name.toLowerCase().includes('plan') || 
      c.name.toLowerCase().includes('backlog')
    ) || categories[0];
    
    let mediaItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>;
    let id: number;

    if (apiItem._type === 'anime') {
      mediaItem = this.malService.convertJikanToAnime(apiItem as JikanAnime, backlogCat.id!);
      id = await this.addMedia({ 
        ...mediaItem, 
        externalId: (apiItem as JikanAnime).mal_id, 
        externalApi: 'mal' 
      });
    } else {
      mediaItem = this.igdbService.convertIGDBToMediaItem(apiItem as IGDBGame, backlogCat.id!);
      id = await this.addMedia(mediaItem);
      const metadata = {
        mediaItemId: id,
        developers: apiItem.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company.name) || [],
        publishers: apiItem.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company.name) || [],
        platforms: apiItem.platforms?.map((p: any) => p.name) || [],
        igdbId: apiItem.id
      };
      await this.saveGameMetadata(metadata);
    }
    
    return id;
  }

  filterLocalMedia(query: string, mediaTypeId: number | null, allMedia: MediaItem[], excludedIds: number[]): MediaItem[] {
    const q = query.toLowerCase();
    if (!q || q.length < 2) return [];
    
    return allMedia.filter(m => 
      m.title.toLowerCase().includes(q) && 
      !excludedIds.includes(m.id!) &&
      (!mediaTypeId || m.mediaTypeId === mediaTypeId)
    ).slice(0, 5);
  }

  filterApiResults(apiResults: any[], allMedia: MediaItem[]): any[] {
    return apiResults.filter(api => {
      if (api._type === 'anime') {
        const localExternalIds = allMedia
          .filter(m => m.mediaTypeId === MediaType.ANIME)
          .map(m => m.externalId);
        return !localExternalIds.includes(api.mal_id);
      } else {
        const localExternalIds = allMedia
          .filter(m => m.mediaTypeId === MediaType.GAME)
          .map(m => m.externalId);
        return !localExternalIds.includes(api.id);
      }
    });
  }

  searchExternalApi(query: string, type: number | null): Observable<any[]> {
    if (!query || query.length < 3) return of([]);

    const searches = [];

    if (!type || type === MediaType.ANIME) {
      searches.push(this.malService.searchAnime(query).pipe(
        map(results => results.map(a => ({ ...a, _type: 'anime' }))),
        catchError(() => of([]))
      ));
    }

    if (!type || type === MediaType.GAME) {
      searches.push(this.igdbService.searchGames(query).pipe(
        map(results => results.map(g => ({ ...g, _type: 'game' }))),
        catchError(() => of([]))
      ));
    }

    if (!type || type === MediaType.MOVIE) {
      searches.push(this.tmdbService.searchMovies(query).pipe(
        map(results => results.map((m: any) => ({ ...m, _type: 'movie' }))),
        catchError(() => of([]))
      ));
    }

    if (searches.length === 0) return of([]);

    return combineLatestRxjs(searches).pipe(
      map(results => results.flat())
    );
  }

  getMediaImages$(mediaItemId?: number): Observable<MediaGalleryImage[]> {
    return from(liveQuery(async () => {
      let items;
      if (mediaItemId) {
        items = await db.mediaImages.where('mediaItemId').equals(mediaItemId).toArray();
      } else {
        items = await db.mediaImages.toArray();
      }
      return items.filter(img => !img.isDeleted);
    }));
  }

  getMediaImagesByYear$(year: number, mediaTypeId?: number | null): Observable<MediaGalleryImage[]> {
    return from(liveQuery(async () => {
      // First get media items active in that year
      const allMedia = await this.getAllMedia(mediaTypeId);
      const activeMedia = this.filterMediaList(allMedia, { activityYear: year });
      const activeIds = activeMedia.map(m => m.id).filter(id => !!id) as number[];
      
      if (activeIds.length === 0) return [];
      
      const images = await db.mediaImages
        .where('mediaItemId')
        .anyOf(activeIds)
        .toArray();
        
      return images.filter(img => !img.isDeleted);
    }));
  }
}
