import { Injectable, inject, signal } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, BehaviorSubject, combineLatest, map } from 'rxjs';
import { MediaItem, MediaFilterParams, MediaType } from '../models/media-type.model';
import { Category } from '../models/status.model';
import { db } from './database.service';
import { SyncService } from './sync.service';
import { AnimeMetadata } from '../models/anime-metadata.model';
import { MangaMetadata } from '../models/manga-metadata.model';
import { GameMetadata } from '../models/game-metadata.model';
import { MovieMetadata } from '../models/movie-metadata.model';

export interface MediaByCategory {
  category: Category;
  media: MediaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private syncService = inject(SyncService);
  public filterUpdate$ = new BehaviorSubject<number>(0);
  public metadataSyncRequested = signal(false);

  constructor() {}

  triggerFilterUpdate() {
    this.filterUpdate$.next(Date.now());
  }

  getAllMedia$(mediaTypeId?: number | null): Observable<MediaItem[]> {
    return from(liveQuery(() => {
      if (mediaTypeId) {
        return db.mediaItems.where('mediaTypeId').equals(mediaTypeId).toArray();
      }
      return db.mediaItems.toArray();
    })).pipe(
      map(list => list.filter(m => !m.isDeleted))
    );
  }

  async getAllMedia(mediaTypeId?: number | null): Promise<MediaItem[]> {
    let items;
    if (mediaTypeId) {
      items = await db.mediaItems.where('mediaTypeId').equals(mediaTypeId).toArray();
    } else {
      items = await db.mediaItems.toArray();
    }
    return items.filter(m => !m.isDeleted);
  }

  getMediaByStatus$(statusId: number, mediaTypeId?: number | null): Observable<MediaItem[]> {
    return from(liveQuery(async () => {
      let query = db.mediaItems.where('statusId').equals(statusId);
      let items = await query.toArray();
      if (mediaTypeId) {
        items = items.filter(m => m.mediaTypeId === mediaTypeId);
      }
      return items;
    })).pipe(
      map(list => list.filter(m => !m.isDeleted))
    );
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
    return await db.mediaItems.get(id);
  }

  getMediaById$(id: number): Observable<MediaItem | undefined> {
    return from(liveQuery(() => db.mediaItems.get(id)));
  }

  async getMediaBySupabaseId(supabaseId: number): Promise<MediaItem | undefined> {
    return await db.mediaItems.where('supabaseId').equals(supabaseId).first();
  }

  async addMedia(media: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const id = await db.mediaItems.add({
      ...media,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    } as MediaItem);
    
    console.log("generated id: ", id);
    this.triggerFilterUpdate();
    this.syncService.sync();  
    return id as number;
  }

  async updateMedia(id: number, updates: Partial<MediaItem>): Promise<number> {
    const result = await db.mediaItems.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    this.syncService.sync();
    return result;
  }

  async updateMediaStatus(id: number, statusId: number): Promise<number> {
    const result = await db.mediaItems.update(id, {
      statusId,
      updatedAt: new Date()
    });
    this.syncService.sync();
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
        if (!hasActivityDates) {
          return !!addedInYear;
        }

        const activeInYear = m.activityDates!.some(d => {
          const dDate = new Date(d);
          return dDate.getFullYear() === targetYear;
        });
        
        return activeInYear;
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
}
