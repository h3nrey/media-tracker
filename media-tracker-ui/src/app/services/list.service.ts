import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, map } from 'rxjs';
import { List, Folder, ListDetails } from '../models/list.model';
import { db } from './database.service';
import { SyncService } from './sync.service';
import { MediaItem } from '../models/media-type.model';

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
      
      const mediaItems = await db.mediaItems.limit(5).toArray();
      const mediaItemIds = mediaItems.map(m => m.id!);
      
      await this.addList({
        name: 'My Awesome List',
        description: 'A collection of my favorites',
        mediaItemIds: mediaItemIds,
        animeIds: mediaItemIds, // Legacy support
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

  getListById$(id: number): Observable<ListDetails | null> {
    return from(liveQuery(async () => {
      const list = await db.lists.get(id);
      if (!list) return null;

      const itemIds = list.mediaItemIds || list.animeIds || [];
      const items = await Promise.all(
        itemIds.map(itemId => db.mediaItems.get(itemId))
      );

      return {
        ...list,
        mediaItems: items.filter(m => !!m) as MediaItem[],
        animes: items.filter(m => !!m && m.mediaTypeId === 1) as any[] // For legacy components
      } as ListDetails;
    }));
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

  async saveList(id: number | undefined, data: { 
    name: string, 
    folderId?: number, 
    mediaTypeId?: number | null, 
    mediaItemIds: number[] 
  }): Promise<number> {
    const listData = {
      ...data,
      animeIds: data.mediaItemIds // Support legacy components that use animeIds
    };

    if (id) {
      return await this.updateList(id, listData);
    } else {
      return await this.addList(listData);
    }
  }

  getListsContainingItem$(itemId: number): Observable<List[]> {
    return from(liveQuery(async () => {
      const allLists = await db.lists.toArray();
      return allLists.filter(l => !l.isDeleted && (l.mediaItemIds?.includes(itemId) || l.animeIds?.includes(itemId)));
    }));
  }
}
