import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, Observable, map } from 'rxjs';
import { db } from './database.service';
import { SyncService } from './sync.service';
import { WatchSource } from '../models/watch-source.model';

@Injectable({
  providedIn: 'root'
})
export class WatchSourceService {
  private syncService = inject(SyncService);
  
  getAllSources$(): Observable<WatchSource[]> {
    return from(liveQuery(() => 
        db.watchSources.toArray()
    )).pipe(
        map(sources => sources.filter(s => !s.isDeleted))
    );
  }

  async getAllSources(): Promise<WatchSource[]> {
    const sources = await db.watchSources.toArray();
    return sources.filter(s => !s.isDeleted);
  }

  async addSource(source: Omit<WatchSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const id = await db.watchSources.add({
      ...source,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      version: 1
    } as WatchSource);
    
    this.syncService.sync();
    return id;
  }

  async updateSource(id: number, changes: Partial<WatchSource>): Promise<void> {
    const existing = await db.watchSources.get(id);
    await db.watchSources.update(id, {
      ...changes,
      updatedAt: new Date(),
      version: (existing?.version || 1) + 1
    });
    this.syncService.sync();
  }

  async deleteSource(id: number): Promise<void> {
    const existing = await db.watchSources.get(id);
    await db.watchSources.update(id, {
        isDeleted: true,
        updatedAt: new Date(),
        version: (existing?.version || 1) + 1
    });
    this.syncService.sync();
  }
}
