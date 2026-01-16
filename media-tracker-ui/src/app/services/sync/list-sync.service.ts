import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { List, Folder } from '../../models/list.model';

@Injectable({
  providedIn: 'root'
})
export class ListSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    await this.syncFolders();
    await this.syncLists();
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
        icon: local.icon,
        order: local.order,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (local.supabaseId) {
          // Deleted on remote - remove locally
          await db.folders.delete(local.id!);
          continue;
        }

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
            icon: remote.icon,
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
          icon: remote.icon,
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
    const mediaItems = await db.mediaItems.toArray();
    
    const mapLocalToSupabaseFolder = (localId?: number) => localId ? folders.find(f => f.id === localId)?.supabaseId : null;
    const mapSupabaseToLocalFolder = (supabaseId?: number) => supabaseId ? folders.find(f => f.supabaseId === supabaseId)?.id : undefined;

    const mapLocalToSupabaseMediaIds = (localIds: number[]) => 
      localIds.map(id => mediaItems.find(m => m.id === id)?.supabaseId).filter(id => !!id);
    
    const mapSupabaseToLocalMediaIds = (supabaseIds: number[]) => 
      supabaseIds.map(id => mediaItems.find(m => m.supabaseId === id)?.id).filter(id => !!id) as number[];

    for (const local of localLists) {
      const remote = remoteLists?.find(r => r.id === local.supabaseId);
      
      const supabaseData = {
        name: local.name,
        description: local.description,
        folder_id: mapLocalToSupabaseFolder(local.folderId),
        media_item_ids: mapLocalToSupabaseMediaIds(local.mediaItemIds || []),
        media_type_id: local.mediaTypeId,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (local.supabaseId) {
          // Deleted on remote - remove locally
          await db.lists.delete(local.id!);
          continue;
        }

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
            mediaItemIds: mapSupabaseToLocalMediaIds(remote.media_item_ids || []),
            mediaTypeId: remote.media_type_id,
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
          mediaItemIds: mapSupabaseToLocalMediaIds(remote.media_item_ids || []),
          mediaTypeId: remote.media_type_id,
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as List);
      }
    }
  }
}
