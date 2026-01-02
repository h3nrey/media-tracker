import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { Anime } from '../models/anime.model';
import { db } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  constructor() {}

  /**
   * Get all anime as an observable that updates automatically
   */
  getAllAnime$(): Observable<Anime[]> {
    return from(liveQuery(() => db.anime.toArray()));
  }

  /**
   * Get anime by status as an observable
   */
  getAnimeByStatus$(statusId: number): Observable<Anime[]> {
    return from(liveQuery(() => 
      db.anime.where('statusId').equals(statusId).toArray()
    ));
  }

  /**
   * Get a single anime by ID
   */
  async getAnimeById(id: number): Promise<Anime | undefined> {
    return await db.anime.get(id);
  }

  /**
   * Add a new anime
   */
  async addAnime(anime: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const animeToAdd: Omit<Anime, 'id'> = {
      ...anime,
      createdAt: now,
      updatedAt: now
    };
    
    return await db.anime.add(animeToAdd as Anime);
  }

  /**
   * Update an existing anime
   */
  async updateAnime(id: number, updates: Partial<Anime>): Promise<number> {
    return await db.anime.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Update anime status (for drag & drop)
   */
  async updateAnimeStatus(id: number, statusId: number): Promise<number> {
    return await db.anime.update(id, {
      statusId,
      updatedAt: new Date()
    });
  }

  /**
   * Delete an anime
   */
  async deleteAnime(id: number): Promise<void> {
    await db.anime.delete(id);
  }

  /**
   * Search anime by title (local search)
   */
  async searchAnimeByTitle(query: string): Promise<Anime[]> {
    const lowerQuery = query.toLowerCase();
    return await db.anime
      .filter(anime => anime.title.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  /**
   * Get anime count by status
   */
  async getAnimeCountByStatus(statusId: number): Promise<number> {
    return await db.anime.where('statusId').equals(statusId).count();
  }
}
