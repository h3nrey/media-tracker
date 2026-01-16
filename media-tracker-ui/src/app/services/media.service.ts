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
import { MalService } from './mal.service';
import { IgdbService, IGDBGame } from './igdb.service';
import { CategoryService } from './status.service';
import { JikanAnime } from '../models/mal-anime.model';
import { of, catchError, combineLatest as combineLatestRxjs } from 'rxjs';

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
  private categoryService = inject(CategoryService);

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
          media: allMedia.filter(m => m.statusId === category.supabaseId)
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
          media: filteredMedia.filter(m => m.statusId === category.supabaseId)
        }));
      })
    );
  }

  async getMediaById(id: number): Promise<MediaItem | undefined> {
    const item = await db.mediaItems.get(id);
    if (!item) return undefined;
    
    const logs = await db.mediaLogs.where('mediaItemId').equals(id).toArray();
    return { ...item, logs: logs.filter(l => !l.isDeleted) };
  }

  getMediaById$(id: number): Observable<MediaItem | undefined> {
    return from(liveQuery(() => this.getMediaById(id)));
  }

  async getMediaBySupabaseId(supabaseId: number): Promise<MediaItem | undefined> {
    return await db.mediaItems.where('supabaseId').equals(supabaseId).first();
  }

  async getMediaByExternalId(externalId: number, externalApi: string): Promise<MediaItem | undefined> {
    return await db.mediaItems
      .where('externalId')
      .equals(externalId)
      .and(item => item.externalApi === externalApi && !item.isDeleted)
      .first();
  }


  async addMedia(media: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const { logs, ...mediaData } = media;
    
    const id = await db.mediaItems.add({
      ...mediaData,
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
    
    console.log("generated id: ", id);
    this.triggerFilterUpdate();
    this.syncService.sync();  
    return id as number;
  }

  async updateMedia(id: number, updates: Partial<MediaItem>): Promise<number> {
    const now = new Date();
    const { logs, ...itemUpdates } = updates;

    const result = await db.mediaItems.update(id, {
      ...itemUpdates,
      updatedAt: now
    });

    if (logs) {
      // For simplicity, we'll replace or update logs. 
      // If log has ID, put it (update). If not, add it.
      for (const log of logs) {
        if (log.id) {
          await db.mediaLogs.update(log.id, { ...log, updatedAt: now });
        } else {
          await db.mediaLogs.add({ ...log, mediaItemId: id, createdAt: now, updatedAt: now });
        }
      }
      
      // Handle deletions if necessary - but for now let's just keep it simple as the user might just want to sync the array.
      // Actually, standard behavior for this kind of implementation is often "clear and replace" if it's an array input.
      // But Dexie logs table is separate.
    }

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

    if (searches.length === 0) return of([]);

    return combineLatestRxjs(searches).pipe(
      map(results => results.flat())
    );
  }
}
