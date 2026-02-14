import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of, switchMap, combineLatest } from 'rxjs';
import { List, Folder, ListDetails } from '../models/list.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { MediaItem } from '../models/media-type.model';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class ListService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  private mediaService = inject(MediaService);

  private mapListFromSupabase(item: any): List {
    return {
      id: item.id,
      supabaseId: item.id,
      name: item.name,
      description: item.description,
      folderId: item.folder_id,
      mediaTypeId: item.media_type_id,
      mediaItemIds: item.media_item_ids || [],
      animeIds: item.media_item_ids || [], // Legacy support
      isDeleted: item.is_deleted,
      version: item.version,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  private mapFolderFromSupabase(item: any): Folder {
    return {
      id: item.id,
      supabaseId: item.id,
      name: item.name,
      order: item.order,
      isDeleted: item.is_deleted,
      version: item.version,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  getLists$(): Observable<List[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getLists()))
    );
  }

  async getLists(): Promise<List[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Error fetching lists:', error);
      return [];
    }

    return (data || []).map(item => this.mapListFromSupabase(item));
  }

  getListById$(id: number): Observable<ListDetails | null> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getListById(id)))
    );
  }

  async getListById(id: number): Promise<ListDetails | null> {
    const { data: listData, error: listError } = await this.supabaseService.client
      .from('lists')
      .select('*')
      .eq('id', id)
      .single();

    if (listError || !listData) return null;
    const list = this.mapListFromSupabase(listData);

    const itemIds = list.mediaItemIds || [];
    if (itemIds.length === 0) {
      return { ...list, mediaItems: [], animes: [] };
    }

    const items = await Promise.all(
      itemIds.map(itemId => this.mediaService.getMediaById(itemId))
    );

    const validItems = items.filter((m): m is MediaItem => !!m);

    return {
      ...list,
      mediaItems: validItems,
      animes: validItems.filter(m => m.mediaTypeId === 1) as any[]
    } as ListDetails;
  }

  getFolders$(): Observable<Folder[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getFolders()))
    );
  }

  async getFolders(): Promise<Folder[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('order', { ascending: true });

    if (error) return [];
    return (data || []).map(item => this.mapFolderFromSupabase(item));
  }

  getListsByFolder$(folderId: number): Observable<List[]> {
    return this.getLists$().pipe(
      map(lists => lists.filter(l => l.folderId === folderId))
    );
  }

  async addList(list: Omit<List, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const supabaseData = {
      user_id: user.id,
      name: list.name,
      description: list.description,
      folder_id: list.folderId,
      media_type_id: list.mediaTypeId,
      media_item_ids: list.mediaItemIds,
      is_deleted: false,
      version: list.version || 1
    };

    const { data, error } = await this.supabaseService.client
      .from('lists')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  async updateList(id: number, updates: Partial<List>): Promise<number> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) supabaseData.name = updates.name;
    if (updates.description !== undefined) supabaseData.description = updates.description;
    if (updates.folderId !== undefined) supabaseData.folder_id = updates.folderId;
    if (updates.mediaTypeId !== undefined) supabaseData.media_type_id = updates.mediaTypeId;
    if (updates.mediaItemIds !== undefined) supabaseData.media_item_ids = updates.mediaItemIds;
    if (updates.version !== undefined) supabaseData.version = updates.version;

    const { error } = await this.supabaseService.client
      .from('lists')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return id;
  }

  async deleteList(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('lists')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
  }

  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const supabaseData = {
      user_id: user.id,
      name: folder.name,
      order: folder.order,
      is_deleted: false,
      version: folder.version || 1
    };

    const { data, error } = await this.supabaseService.client
      .from('folders')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  async updateFolder(id: number, updates: Partial<Folder>): Promise<number> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) supabaseData.name = updates.name;
    if (updates.order !== undefined) supabaseData.order = updates.order;
    if (updates.version !== undefined) supabaseData.version = updates.version;

    const { error } = await this.supabaseService.client
      .from('folders')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return id;
  }

  async deleteFolder(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('folders')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
  }

  async saveList(id: number | undefined, data: { 
    name: string, 
    folderId?: number, 
    mediaTypeId?: number | null, 
    mediaItemIds: number[],
    version?: number
  }): Promise<number> {
    const listData = {
      ...data,
      mediaItemIds: data.mediaItemIds,
      version: data.version || 1
    } as Omit<List, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>;

    if (id) {
      return await this.updateList(id, listData);
    } else {
      return await this.addList(listData);
    }
  }

  filterLists(
    lists: List[], 
    folderId: number | 'all', 
    allMedia: MediaItem[], 
    filters: any
  ): any[] {
    let filtered = lists.filter(l => !l.isDeleted);
    
    if (folderId !== 'all') {
      filtered = filtered.filter(l => l.folderId === folderId);
    }

    if ((filters.genres?.length > 0) || (filters.studios?.length > 0)) {
      filtered = filtered.filter(list => {
        const itemIds = list.mediaItemIds || [];
        const listItems = itemIds.map(id => allMedia.find(m => m.id === id)).filter(m => !!m) as MediaItem[];
        
        const matchesGenre = filters.genres?.length > 0 
          ? listItems.some(item => filters.genres!.every((g: string) => item.genres?.includes(g)))
          : true;
        
        const matchesStudio = filters.studios?.length > 0
          ? listItems.some(item => filters.studios!.some((s: string) => item.studios?.includes(s)))
          : true;
          
        return matchesGenre && matchesStudio;
      });
    }

    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(l => l.name.toLowerCase().includes(q));
    }

    const enriched = filtered.map(list => {
      const itemIds = list.mediaItemIds || [];
      const items = itemIds.map(id => allMedia.find(m => m.id === id)).filter(m => !!m) as MediaItem[];
      
      const completedCount = items.filter(m => {
        const hasFinishedRun = m.runs?.some(r => !!r.endDate);
        if (m.endDate || hasFinishedRun) return true;
        if (m.progressTotal && m.progressTotal > 0 && m.progressCurrent === m.progressTotal) return true;
        return false;
      }).length;

      return {
        ...list,
        covers: items.map(item => item.coverImage).filter(img => !!img).slice(0, 5),
        itemCount: items.length,
        completedCount,
        progress: items.length > 0 ? (completedCount / items.length) * 100 : 0
      };
    });

    const mult = filters.sortOrder === 'asc' ? 1 : -1;
    enriched.sort((a, b) => {
      if (filters.sortBy === 'title') {
        return a.name.localeCompare(b.name) * mult;
      }
      const valA = new Date(a.updatedAt || 0).getTime();
      const valB = new Date(b.updatedAt || 0).getTime();
      return (valA - valB) * mult;
    });

    return enriched;
  }

  getListsContainingItem$(itemId: number): Observable<List[]> {
    return this.getLists$().pipe(
      map(lists => lists.filter(l => l.mediaItemIds?.includes(itemId)))
    );
  }

  async seedInitialData() {
    // Optional: Seed Supabase if empty, similar to CategoryService
  }
}
