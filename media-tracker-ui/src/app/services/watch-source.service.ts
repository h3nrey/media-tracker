import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { liveQuery } from 'dexie';
import { db } from './database.service';
import { WatchSource } from '../models/watch-source.model';

@Injectable({
  providedIn: 'root'
})
export class WatchSourceService {
  
  getAllSources$(): Observable<WatchSource[]> {
    return from(liveQuery(() => db.watchSources.toArray()));
  }

  async getAllSources(): Promise<WatchSource[]> {
    return await db.watchSources.toArray();
  }

  async addSource(source: Omit<WatchSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    return await db.watchSources.add({
      ...source,
      createdAt: now,
      updatedAt: now
    });
  }

  async updateSource(id: number, changes: Partial<WatchSource>): Promise<number> {
    return await db.watchSources.update(id, {
      ...changes,
      updatedAt: new Date()
    });
  }

  async deleteSource(id: number): Promise<void> {
    await db.watchSources.delete(id);
  }
}
