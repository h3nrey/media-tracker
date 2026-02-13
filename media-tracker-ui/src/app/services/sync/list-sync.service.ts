import { Injectable, inject } from '@angular/core';
import { db } from '../database.service';
import { List, Folder } from '../../models/list.model';
import { SyncBaseService } from './sync-base.service';

@Injectable({
  providedIn: 'root'
})
export class FolderSyncService extends SyncBaseService<Folder> {
  protected override tableName = 'folders';
  protected override entityType = 'Folder';

  async sync(lastSyncedAt?: Date) {
    const localFolders = await db.folders.toArray();
    await this.syncEntity(localFolders, lastSyncedAt);
  }

  protected override async handleMissingLocal(remote: any) {
    await db.folders.add({
      supabaseId: remote.id,
      name: remote.name,
      icon: remote.icon,
      order: remote.order,
      isDeleted: remote.is_deleted,
      version: remote.version,
      createdAt: new Date(remote.created_at),
      updatedAt: new Date(remote.updated_at)
    } as Folder);
  }

  protected override async pullRemote(localId: number, remote: any) {
    await db.folders.update(localId, {
      name: remote.name,
      icon: remote.icon,
      order: remote.order,
      isDeleted: remote.is_deleted,
      version: remote.version,
      updatedAt: new Date(remote.updated_at)
    });
  }

  protected override mapToSupabase(local: Folder) {
    return {
      name: local.name,
      icon: local.icon,
      order: local.order,
      is_deleted: !!local.isDeleted,
      updated_at: local.updatedAt.toISOString()
    };
  }

  protected override async handleNewLocal(local: Folder) {
    const { data: matchedRemote } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('name', local.name)
      .maybeSingle();

    if (matchedRemote) {
      await db.folders.update(local.id!, { supabaseId: matchedRemote.id });
      await this.pullRemote(local.id!, matchedRemote);
      return;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([{
        ...this.mapToSupabase(local),
        version: 1,
        created_at: local.createdAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting folder:', error);
    } else {
      await db.folders.update(local.id!, { supabaseId: data.id, version: data.version });
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class ListSyncService extends SyncBaseService<List> {
  protected override tableName = 'lists';
  protected override entityType = 'List';

  protected folderSync = inject(FolderSyncService);

  async sync(lastSyncedAt?: Date) {
    await this.folderSync.sync(lastSyncedAt);
    const localLists = await db.lists.toArray();
    await this.syncEntity(localLists, lastSyncedAt);
  }

  protected override async handleMissingLocal(remote: any) {
    const folders = await db.folders.toArray();
    const mediaItems = await db.mediaItems.toArray();
    
    const mapSupabaseToLocalFolder = (supabaseId?: number) => supabaseId ? folders.find(f => f.supabaseId === supabaseId)?.id : undefined;
    const mapSupabaseToLocalMediaIds = (supabaseIds: number[]) => 
      (supabaseIds || []).map(id => mediaItems.find(m => m.supabaseId === id)?.id).filter(id => !!id) as number[];

    await db.lists.add({
      supabaseId: remote.id,
      name: remote.name,
      description: remote.description,
      folderId: mapSupabaseToLocalFolder(remote.folder_id),
      mediaItemIds: mapSupabaseToLocalMediaIds(remote.media_item_ids),
      mediaTypeId: remote.media_type_id,
      isDeleted: remote.is_deleted,
      version: remote.version,
      createdAt: new Date(remote.created_at),
      updatedAt: new Date(remote.updated_at)
    } as List);
  }

  protected override async pullRemote(localId: number, remote: any) {
    const folders = await db.folders.toArray();
    const mediaItems = await db.mediaItems.toArray();
    
    const mapSupabaseToLocalFolder = (supabaseId?: number) => supabaseId ? folders.find(f => f.supabaseId === supabaseId)?.id : undefined;
    const mapSupabaseToLocalMediaIds = (supabaseIds: number[]) => 
      (supabaseIds || []).map(id => mediaItems.find(m => m.supabaseId === id)?.id).filter(id => !!id) as number[];

    await db.lists.update(localId, {
      name: remote.name,
      description: remote.description,
      folderId: mapSupabaseToLocalFolder(remote.folder_id),
      mediaItemIds: mapSupabaseToLocalMediaIds(remote.media_item_ids),
      mediaTypeId: remote.media_type_id,
      isDeleted: remote.is_deleted,
      version: remote.version,
      updatedAt: new Date(remote.updated_at)
    });
  }

  protected override mapToSupabase(local: List) {
    return {
      name: local.name,
      description: local.description,
      media_type_id: local.mediaTypeId,
      is_deleted: !!local.isDeleted,
      updated_at: local.updatedAt.toISOString()
    };
  }

  protected override async pushLocalWithVersionCheck(local: List, remote: any) {
    const folders = await db.folders.toArray();
    const mediaItems = await db.mediaItems.toArray();
    const mapLocalToSupabaseFolder = (localId?: number) => localId ? folders.find(f => f.id === localId)?.supabaseId : null;
    const mapLocalToSupabaseMediaIds = (localIds: number[]) => 
      (localIds || []).map(id => mediaItems.find(m => m.id === id)?.supabaseId).filter(id => !!id);

    const supabaseData = {
      ...this.mapToSupabase(local),
      folder_id: mapLocalToSupabaseFolder(local.folderId),
      media_item_ids: mapLocalToSupabaseMediaIds(local.mediaItemIds || [])
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ ...supabaseData, version: local.version })
      .eq('id', local.supabaseId)
      .eq('version', remote.version)
      .select()
      .single();

    if (error || !data) {
      await this.recordConflict(local, remote);
    }
  }

  protected override async handleNewLocal(local: List) {
     const { data: matchedRemote } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('name', local.name)
      .eq('media_type_id', local.mediaTypeId)
      .maybeSingle();

    if (matchedRemote) {
      await db.lists.update(local.id!, { supabaseId: matchedRemote.id });
      await this.pullRemote(local.id!, matchedRemote);
      return;
    }

    const folders = await db.folders.toArray();
    const mediaItems = await db.mediaItems.toArray();
    const mapLocalToSupabaseFolder = (localId?: number) => localId ? folders.find(f => f.id === localId)?.supabaseId : null;
    const mapLocalToSupabaseMediaIds = (localIds: number[]) => 
      (localIds || []).map(id => mediaItems.find(m => m.id === id)?.supabaseId).filter(id => !!id);

    const supabaseData = {
      ...this.mapToSupabase(local),
      folder_id: mapLocalToSupabaseFolder(local.folderId),
      media_item_ids: mapLocalToSupabaseMediaIds(local.mediaItemIds || [])
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([{
        ...supabaseData,
        version: 1,
        created_at: local.createdAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting list:', error);
    } else {
      await db.lists.update(local.id!, { supabaseId: data.id, version: data.version });
    }
  }
}
