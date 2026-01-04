import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, map } from 'rxjs';
import { List, Folder, ListDetails } from '../models/list.model';
import { db } from './database.service';
import { SyncService } from './sync.service';
import { Anime } from '../models/anime.model';

@Injectable({
  providedIn: 'root'
})
export class ListService {
  private syncService = inject(SyncService);

  constructor() {
    this.seedInitialData();
  }

  async seedInitialData() {
    const listCount = await db.lists.count();
    if (listCount === 0) {
      const folderId = await this.addFolder({ name: 'My Lists', order: 1 });
      await this.addFolder({ name: 'Top Lists', order: 2 });
      
      // Get some anime IDs to create a dummy list
      const animes = await db.anime.limit(5).toArray();
      const animeIds = animes.map(a => a.id!);
      
      await this.addList({
        name: 'My Awesome List',
        description: 'A list of my favorite animes',
        animeIds: animeIds,
        folderId: folderId
      });
    }
  }

  getLists$(): Observable<List[]> {
    return from(liveQuery(() => 
      db.lists.toArray()
    )).pipe(
      map(lists => lists.filter(l => !l.isDeleted))
    );
  }

  getListById$(id: number): Observable<ListDetails> {
    return from(liveQuery(async () => {
      const list = await db.lists.get(id);
      if (!list) return null;

      const animes = await Promise.all(
        list.animeIds.map(animeId => db.anime.get(animeId))
      );

      return {
        ...list,
        animes: animes.filter(a => !!a) as Anime[]
      } as ListDetails;
    })).pipe(
      map(listDetails => listDetails as ListDetails)
    );
  }

  getFolders$(): Observable<Folder[]> {
    return from(liveQuery(() => 
      db.folders.orderBy('order').toArray()
    )).pipe(
      map(folders => folders.filter(f => !f.isDeleted))
    );
  }

  getListsByFolder$(folderId: number): Observable<List[]> {
    return from(liveQuery(() => 
      db.lists.where('folderId').equals(folderId).toArray()
    )).pipe(
      map(lists => lists.filter(l => !l.isDeleted))
    );
  }

  async addList(list: Omit<List, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<number> {
    const now = new Date();
    const id = await db.lists.add({
      ...list,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    } as List);
    
    this.syncService.sync();
    return id;
  }

  async updateList(id: number, updates: Partial<List>): Promise<number> {
    const result = await db.lists.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    this.syncService.sync();
    return result;
  }

  async deleteList(id: number): Promise<void> {
    await db.lists.update(id, {
      isDeleted: true,
      updatedAt: new Date()
    });
    this.syncService.sync();
  }

  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<number> {
    const now = new Date();
    const id = await db.folders.add({
      ...folder,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    } as Folder);
    
    this.syncService.sync();
    return id;
  }

  async updateFolder(id: number, updates: Partial<Folder>): Promise<number> {
    const result = await db.folders.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    this.syncService.sync();
    return result;
  }

  async deleteFolder(id: number): Promise<void> {
    await db.folders.update(id, {
      isDeleted: true,
      updatedAt: new Date()
    });
    this.syncService.sync();
  }

  getListsContainingAnime$(animeId: number): Observable<List[]> {
    return from(liveQuery(async () => {
      const allLists = await db.lists.toArray();
      return allLists.filter(l => !l.isDeleted && l.animeIds.includes(animeId));
    }));
  }
}
