import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { db } from './database.service';
import { Anime } from '../models/anime.model';
import { Category } from '../models/status.model';
import { WatchSource } from '../models/watch-source.model';
import { List, Folder } from '../models/list.model';
import { from, firstValueFrom, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private supabase = inject(SupabaseService).client;
  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  isSyncing$ = this.isSyncingSubject.asObservable();

  async sync() {
    if (this.isSyncingSubject.value) return;
    
    console.log('Starting sync...');
    this.isSyncingSubject.next(true);
    
    try {
      // Order matters: categories -> watchSources -> anime (due to foreign keys)
      await this.syncCategories();
      await this.syncWatchSources();
      await this.syncAnime();
      await this.syncFolders();
      await this.syncLists();
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncingSubject.next(false);
    }
  }

  private async syncCategories() {
    // 1. Get all local categories that were updated after last sync
    const localCategories = await db.categories.toArray();
    
    // 2. Get all remote categories
    const { data: remoteCategories, error } = await this.supabase
      .from('categories')
      .select('*');
    
    if (error) throw error;

    // 3. Conflict Resolution & Sync
    for (const local of localCategories) {
      const remote = remoteCategories?.find(r => r.id === local.supabaseId);
      
      if (!remote) {
        // Not on remote yet, upload it
        if (!local.isDeleted) {
            const { data, error: insertError } = await this.supabase
            .from('categories')
            .insert([{
                name: local.name,
                color: local.color,
                order: local.order,
                is_deleted: false,
                created_at: local.createdAt.toISOString(),
                updated_at: local.updatedAt.toISOString()
            }])
            .select()
            .single();

            if (insertError) console.error('Error inserting category:', insertError);
            else {
                await db.categories.update(local.id!, { 
                    supabaseId: data.id, 
                    lastSyncedAt: new Date() 
                });
            }
        }
      } else {
        // Exists on both, check which is newer
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          // Local is newer, push to remote
          await this.supabase
            .from('categories')
            .update({
              name: local.name,
              color: local.color,
              order: local.order,
              is_deleted: !!local.isDeleted,
              updated_at: local.updatedAt.toISOString()
            })
            .eq('id', local.supabaseId);
          
          await db.categories.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          // Remote is newer, pull to local
          await db.categories.update(local.id!, {
            name: remote.name,
            color: remote.color,
            order: remote.order,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    // 4. Handle categories that exist on remote but not locally
    for (const remote of remoteCategories || []) {
      const local = localCategories.find(l => l.supabaseId === remote.id);
      if (!local) {
        await db.categories.add({
          supabaseId: remote.id,
          name: remote.name,
          color: remote.color,
          order: remote.order,
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as Category);
      }
    }
  }

  private async syncWatchSources() {
    const localSources = await db.watchSources.toArray();
    const { data: remoteSources, error } = await this.supabase
      .from('watch_sources')
      .select('*');
    
    if (error) throw error;

    for (const local of localSources) {
      const remote = remoteSources?.find(r => r.id === local.supabaseId);
      if (!remote) {
        if (!local.isDeleted) {
            const { data, error: insertError } = await this.supabase
            .from('watch_sources')
            .insert([{
                name: local.name,
                base_url: local.baseUrl,
                is_deleted: false,
                created_at: local.createdAt.toISOString(),
                updated_at: local.updatedAt.toISOString()
            }])
            .select()
            .single();

            if (insertError) console.error('Error inserting source:', insertError);
            else {
                await db.watchSources.update(local.id!, { 
                    supabaseId: data.id, 
                    lastSyncedAt: new Date() 
                });
            }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          await this.supabase
            .from('watch_sources')
            .update({
              name: local.name,
              base_url: local.baseUrl,
              is_deleted: !!local.isDeleted,
              updated_at: local.updatedAt.toISOString()
            })
            .eq('id', local.supabaseId);
          await db.watchSources.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          await db.watchSources.update(local.id!, {
            name: remote.name,
            baseUrl: remote.base_url,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    for (const remote of remoteSources || []) {
      const local = localSources.find(l => l.supabaseId === remote.id);
      if (!local) {
        await db.watchSources.add({
          supabaseId: remote.id,
          name: remote.name,
          baseUrl: remote.base_url,
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as WatchSource);
      }
    }
  }

  private async syncAnime() {
    const localAnime = await db.anime.toArray();
    const { data: remoteAnime, error } = await this.supabase
      .from('anime')
      .select('*');
    
    if (error) throw error;

    // Helper to map foreign keys (local Category ID to Supabase Category ID)
    const categories = await db.categories.toArray();
    const mapLocalToSupabaseCategory = (localId: number) => categories.find(c => c.id === localId)?.supabaseId;
    const mapSupabaseToLocalCategory = (supabaseId: number) => categories.find(c => c.supabaseId === supabaseId)?.id;

    for (const local of localAnime) {
      const remote = remoteAnime?.find(r => r.id === local.supabaseId);
      
      const supabaseData = {
        title: local.title,
        cover_image: local.coverImage,
        mal_id: local.malId,
        episodes_watched: local.episodesWatched,
        total_episodes: local.totalEpisodes,
        status_id: mapLocalToSupabaseCategory(local.statusId),
        score: local.score,
        genres: local.genres,
        studios: local.studios,
        release_year: local.releaseYear,
        notes: local.notes,
        watch_dates: local.watchDates?.map(d => d.toISOString()),
        watch_links: local.watchLinks,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (!local.isDeleted) {
            const { data, error: insertError } = await this.supabase
            .from('anime')
            .insert([{
                ...supabaseData,
                created_at: local.createdAt.toISOString()
            }])
            .select()
            .single();

            if (insertError) console.error('Error inserting anime:', insertError);
            else {
                await db.anime.update(local.id!, { 
                    supabaseId: data.id, 
                    lastSyncedAt: new Date() 
                });
            }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          await this.supabase
            .from('anime')
            .update(supabaseData)
            .eq('id', local.supabaseId);
          await db.anime.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          await db.anime.update(local.id!, {
            title: remote.title,
            coverImage: remote.cover_image,
            malId: remote.mal_id,
            episodesWatched: remote.episodes_watched,
            totalEpisodes: remote.total_episodes,
            statusId: mapSupabaseToLocalCategory(remote.status_id) || local.statusId,
            score: remote.score,
            genres: remote.genres || [],
            studios: remote.studios || [],
            releaseYear: remote.release_year,
            notes: remote.notes,
            watchDates: (remote.watch_dates || []).map((d: string) => new Date(d)),
            watchLinks: remote.watch_links || [],
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    // Pull new remote anime
    for (const remote of remoteAnime || []) {
      const local = localAnime.find(l => l.supabaseId === remote.id);
      if (!local) {
        await db.anime.add({
          supabaseId: remote.id,
          title: remote.title,
          coverImage: remote.cover_image,
          malId: remote.mal_id,
          episodesWatched: remote.episodes_watched,
          totalEpisodes: remote.total_episodes,
          statusId: mapSupabaseToLocalCategory(remote.status_id) || 0,
          score: remote.score,
          genres: remote.genres || [],
          studios: remote.studios || [],
          releaseYear: remote.release_year,
          notes: remote.notes,
          watchDates: (remote.watch_dates || []).map((d: string) => new Date(d)),
          watchLinks: remote.watch_links || [],
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as Anime);
      }
    }
  }
  private async syncFolders() {
    console.log('Syncing folders...');
    const localFolders = await db.folders.toArray();
    const { data: remoteFolders, error } = await this.supabase
      .from('folders')
      .select('*');
    
    if (error) throw error;

    for (const local of localFolders) {
      const remote = remoteFolders?.find(r => r.id === local.supabaseId);
      
      const supabaseData = {
        name: local.name,
        order: local.order,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('folders')
            .insert([{ ...supabaseData, created_at: local.createdAt.toISOString() }])
            .select()
            .single();

          if (insertError) console.error('Error inserting folder:', insertError);
          else {
            await db.folders.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          await this.supabase.from('folders').update(supabaseData).eq('id', local.supabaseId);
          await db.folders.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          await db.folders.update(local.id!, {
            name: remote.name,
            order: remote.order,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    for (const remote of remoteFolders || []) {
      const local = localFolders.find(l => l.supabaseId === remote.id);
      if (!local) {
        await db.folders.add({
          supabaseId: remote.id,
          name: remote.name,
          order: remote.order,
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as Folder);
      }
    }
  }

  private async syncLists() {
    console.log('Syncing lists...');
    const localLists = await db.lists.toArray();
    const { data: remoteLists, error } = await this.supabase
      .from('lists')
      .select('*');
    
    if (error) throw error;

    const folders = await db.folders.toArray();
    const anime = await db.anime.toArray();
    
    const mapLocalToSupabaseFolder = (localId?: number) => localId ? folders.find(f => f.id === localId)?.supabaseId : null;
    const mapSupabaseToLocalFolder = (supabaseId?: number) => supabaseId ? folders.find(f => f.supabaseId === supabaseId)?.id : undefined;

    const mapLocalToSupabaseAnimeIds = (localIds: number[]) => 
      localIds.map(id => anime.find(a => a.id === id)?.supabaseId).filter(id => !!id);
    
    const mapSupabaseToLocalAnimeIds = (supabaseIds: number[]) => 
      supabaseIds.map(id => anime.find(a => a.supabaseId === id)?.id).filter(id => !!id) as number[];

    for (const local of localLists) {
      const remote = remoteLists?.find(r => r.id === local.supabaseId);
      
      const supabaseData = {
        name: local.name,
        description: local.description,
        folder_id: mapLocalToSupabaseFolder(local.folderId),
        anime_ids: mapLocalToSupabaseAnimeIds(local.animeIds || []),
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('lists')
            .insert([{ ...supabaseData, created_at: local.createdAt.toISOString() }])
            .select()
            .single();

          if (insertError) console.error('Error inserting list:', insertError);
          else {
            await db.lists.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          await this.supabase.from('lists').update(supabaseData).eq('id', local.supabaseId);
          await db.lists.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          await db.lists.update(local.id!, {
            name: remote.name,
            description: remote.description,
            folderId: mapSupabaseToLocalFolder(remote.folder_id),
            animeIds: mapSupabaseToLocalAnimeIds(remote.anime_ids || []),
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    for (const remote of remoteLists || []) {
      const local = localLists.find(l => l.supabaseId === remote.id);
      if (!local) {
        await db.lists.add({
          supabaseId: remote.id,
          name: remote.name,
          description: remote.description,
          folderId: mapSupabaseToLocalFolder(remote.folder_id),
          animeIds: mapSupabaseToLocalAnimeIds(remote.anime_ids || []),
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as List);
      }
    }
  }
}
