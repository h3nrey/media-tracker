import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, combineLatest, map } from 'rxjs';
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
  constructor() {}

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
}
