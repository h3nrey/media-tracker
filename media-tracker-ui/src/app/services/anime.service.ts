import { Injectable, inject, signal } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, BehaviorSubject, combineLatest, map } from 'rxjs';
import { MediaItem, MediaType, MediaFilterParams } from '../models/media-type.model';
import { Category } from '../models/status.model';
import { db } from './database.service';
import { SyncService } from './sync.service';
import { Anime } from '../models/anime.model';

export interface AnimeByCategory {
  category: Category;
  anime: MediaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private syncService = inject(SyncService);
  public filterUpdate$ = new BehaviorSubject<number>(0);
  public metadataSyncRequested = signal(false);

  constructor() {}

  triggerFilterUpdate() {
    this.filterUpdate$.next(Date.now());
  }

  getAllAnime$(): Observable<Anime[]> {
    return from(liveQuery(async () => {
      const items = await db.mediaItems.where('mediaTypeId').equals(MediaType.ANIME).toArray();
      const withMeta = await Promise.all(items.map(async item => {
        const meta = await db.animeMetadata.get(item.id!);
        return {
          ...item,
          mediaItemId: 1,
          progressCurrent: item.progressCurrent,
          progressTotal: item.progressTotal,
          studios: meta?.studios || []
        } as Anime;
      }));
      return withMeta.filter(a => !a.isDeleted);
    }));
  }

  getAnimeByStatus$(statusId: number): Observable<MediaItem[]> {
    return from(liveQuery(async () => {
      const items = await db.mediaItems
        .where('statusId').equals(statusId)
        .and(item => item.mediaTypeId === MediaType.ANIME)
        .toArray();
      const withMeta = await Promise.all(items.map(async item => {
        const meta = await db.animeMetadata.get(item.id!);
        return {
          ...item,
          progressCurrent: item.progressCurrent,
          progressTotal: item.progressTotal,
          studios: meta?.studios || []
        } as MediaItem;
      }));
      return withMeta.filter(a => !a.isDeleted);
    }));
  }

  getAnimeGroupedByCategory$(categories: Category[]): Observable<AnimeByCategory[]> {
    return this.getAllAnime$().pipe(
      map(allAnime => 
        categories.map(category => ({
          category,
          anime: allAnime.filter(anime => anime.statusId === category.id)
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
    const item = await db.mediaItems.get(id);
    if (!item || item.mediaTypeId !== MediaType.ANIME) return undefined;
    const meta = await db.animeMetadata.get(id);
    const logs = await db.mediaLogs.where('mediaItemId').equals(id).toArray();
    return {
      ...item,
      progressCurrent: item.progressCurrent,
      progressTotal: item.progressTotal,
      studios: meta?.studios || [],
      logs: logs.filter(l => !l.isDeleted)
    } as Anime;
  }

  getAnimeById$(id: number): Observable<Anime | undefined> {
    return from(liveQuery(() => this.getAnimeById(id)));
  }

  async getAnimeBySupabaseId(supabaseId: number): Promise<Anime | undefined> {
    const item = await db.mediaItems.where('supabaseId').equals(supabaseId).first();
    if (!item || item.mediaTypeId !== MediaType.ANIME) return undefined;
    return this.getAnimeById(item.id!);
  }

  getAnimeByExternalId(externalId: number): Observable<MediaItem | undefined> {
    return from(liveQuery(async () => {
      const item = await db.mediaItems
        .where('externalId').equals(externalId)
        .and(m => m.mediaTypeId === MediaType.ANIME)
        .first();
      if (!item) return undefined;
      return this.getAnimeById(item.id!);
    }));
  }

  async addAnime(anime: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const { logs, ...animeData } = anime;
    const id = await db.mediaItems.add({
      ...animeData,
      mediaTypeId: MediaType.ANIME,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    } as MediaItem);
    
    if (logs && logs.length > 0) {
      const logsToAdd = logs.map(log => ({
        ...log,
        mediaItemId: id as number,
        createdAt: now,
        updatedAt: now
      }));
      await db.mediaLogs.bulkAdd(logsToAdd);
    }

    this.syncService.sync();
    return id as number;
  }

  async updateAnime(id: number, updates: Partial<MediaItem>): Promise<number> {
    const now = new Date();
    const { logs, ...itemUpdates } = updates;
    const result = await db.mediaItems.update(id, {
      ...itemUpdates,
      updatedAt: now
    });

    if (logs) {
      for (const log of logs) {
        if (log.id) {
          await db.mediaLogs.update(log.id, { ...log, updatedAt: now });
        } else {
          await db.mediaLogs.add({ ...log, mediaItemId: id, createdAt: now, updatedAt: now });
        }
      }
    }

    this.syncService.sync();
    return result;
  }

  async updateAnimeStatus(id: number, statusId: number): Promise<number> {
    const result = await db.mediaItems.update(id, {
      statusId,
      updatedAt: new Date()
    });
    this.syncService.sync();
    return result;
  }

  async deleteAnime(id: number): Promise<void> {
    // Soft delete for sync
    await db.mediaItems.update(id, {
        isDeleted: true,
        updatedAt: new Date()
    });
    this.syncService.sync();
  }

  async searchAnimeByTitle(query: string): Promise<MediaItem[]> {
    const lowerQuery = query.toLowerCase();
    const list = await db.mediaItems
      .where('mediaTypeId').equals(MediaType.ANIME)
      .and(anime => !anime.isDeleted && anime.title.toLowerCase().includes(lowerQuery))
      .toArray();
    return list;
  }

  async getAnimeCountByStatus(statusId: number): Promise<number> {
    const count = await db.mediaItems
      .where('statusId').equals(statusId)
      .and(m => m.mediaTypeId === MediaType.ANIME && !m.isDeleted)
      .count();
    return count;
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
        if (!hasActivityDates) {
          return !!addedInYear;
        }

        const watchedInYear = a.activityDates!.some(d => {
          const dDate = new Date(d);
          return dDate.getFullYear() === targetYear;
        });
        
        return watchedInYear;
      });
    }

    // Sort
    if (params.sortBy) {
      const mult = params.sortOrder === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        let valA: any = a[params.sortBy as keyof MediaItem];
        let valB: any = b[params.sortBy as keyof MediaItem];
        
        // Handle specific sort keys that might differ from model keys
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
