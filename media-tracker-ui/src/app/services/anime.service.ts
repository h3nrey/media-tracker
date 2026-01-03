import { Injectable, inject, signal } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, BehaviorSubject, combineLatest, map } from 'rxjs';
import { Anime, AnimeFilterParams } from '../models/anime.model';
import { Category } from '../models/status.model';
import { db } from './database.service';
import { SyncService } from './sync.service';

export interface AnimeByCategory {
  category: Category;
  anime: Anime[];
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
    return from(liveQuery(() => 
        db.anime.toArray()
    )).pipe(
        map(list => list.filter(a => !a.isDeleted))
    );
  }

  getAnimeByStatus$(statusId: number): Observable<Anime[]> {
    return from(liveQuery(() => 
      db.anime.where('statusId').equals(statusId).toArray()
    )).pipe(
        map(list => list.filter(a => !a.isDeleted))
    );
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
    filterFn: (anime: Anime[]) => Anime[]
  ): Observable<AnimeByCategory[]> {
    return combineLatest([
      this.getAllAnime$(),
      this.filterUpdate$
    ]).pipe(
      map(([allAnime]) => {
        const filteredAnime = filterFn(allAnime);
        return categories.map(category => ({
          category,
          anime: filteredAnime.filter(anime => anime.statusId === category.id)
        }));
      })
    );
  }

  async getAnimeById(id: number): Promise<Anime | undefined> {
    return await db.anime.get(id);
  }

  async addAnime(anime: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const id = await db.anime.add({
      ...anime,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    } as Anime);
    
    this.syncService.sync();
    return id;
  }

  async updateAnime(id: number, updates: Partial<Anime>): Promise<number> {
    const result = await db.anime.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    this.syncService.sync();
    return result;
  }

  async updateAnimeStatus(id: number, statusId: number): Promise<number> {
    const result = await db.anime.update(id, {
      statusId,
      updatedAt: new Date()
    });
    this.syncService.sync();
    return result;
  }

  async deleteAnime(id: number): Promise<void> {
    // Soft delete for sync
    await db.anime.update(id, {
        isDeleted: true,
        updatedAt: new Date()
    });
    this.syncService.sync();
  }

  async searchAnimeByTitle(query: string): Promise<Anime[]> {
    const lowerQuery = query.toLowerCase();
    const list = await db.anime
      .filter(anime => !anime.isDeleted && anime.title.toLowerCase().includes(lowerQuery))
      .toArray();
    return list;
  }

  async getAnimeCountByStatus(statusId: number): Promise<number> {
    const list = await db.anime.where('statusId').equals(statusId).toArray();
    return list.filter(a => !a.isDeleted).length;
  }

  filterAnimeList(list: Anime[], params: AnimeFilterParams): Anime[] {
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
      result = result.filter(a => a.studios && params.studios!.some((s: string) => a.studios.includes(s)));
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
        
        const hasWatchDates = a.watchDates && a.watchDates.length > 0;
        if (!hasWatchDates) {
          return !!addedInYear;
        }

        const watchedInYear = a.watchDates!.some(d => {
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
        let valA: any = a[params.sortBy as keyof Anime];
        let valB: any = b[params.sortBy as keyof Anime];
        
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
