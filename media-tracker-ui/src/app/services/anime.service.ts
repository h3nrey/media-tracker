import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, BehaviorSubject, combineLatest, map } from 'rxjs';
import { Anime } from '../models/anime.model';
import { Category } from '../models/status.model';
import { db } from './database.service';

export interface AnimeByCategory {
  category: Category;
  anime: Anime[];
}

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private filterUpdate$ = new BehaviorSubject<number>(0);

  constructor() {}

  triggerFilterUpdate() {
    this.filterUpdate$.next(Date.now());
  }

  getAllAnime$(): Observable<Anime[]> {
    return from(liveQuery(() => db.anime.toArray()));
  }

  getAnimeByStatus$(statusId: number): Observable<Anime[]> {
    return from(liveQuery(() => 
      db.anime.where('statusId').equals(statusId).toArray()
    ));
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
    const animeToAdd: Omit<Anime, 'id'> = {
      ...anime,
      createdAt: now,
      updatedAt: now
    };
    
    return await db.anime.add(animeToAdd as Anime);
  }

  async updateAnime(id: number, updates: Partial<Anime>): Promise<number> {
    return await db.anime.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async updateAnimeStatus(id: number, statusId: number): Promise<number> {
    return await db.anime.update(id, {
      statusId,
      updatedAt: new Date()
    });
  }

  async deleteAnime(id: number): Promise<void> {
    await db.anime.delete(id);
  }

  async searchAnimeByTitle(query: string): Promise<Anime[]> {
    const lowerQuery = query.toLowerCase();
    return await db.anime
      .filter(anime => anime.title.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  async getAnimeCountByStatus(statusId: number): Promise<number> {
    return await db.anime.where('statusId').equals(statusId).count();
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
      result = result.filter(a => a.genres && params.genres!.every(g => a.genres.includes(g)));
    }

    // Studios
    if (params.studios && params.studios.length > 0) {
      result = result.filter(a => a.studios && params.studios!.some(s => a.studios.includes(s)));
    }

    // Year
    if (params.year) {
      result = result.filter(a => a.releaseYear === params.year);
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

export interface AnimeFilterParams {
  query?: string;
  sortBy?: 'title' | 'score' | 'updated' | 'releaseYear';
  sortOrder?: 'asc' | 'desc';
  genres?: string[];
  studios?: string[];
  year?: number;
}
