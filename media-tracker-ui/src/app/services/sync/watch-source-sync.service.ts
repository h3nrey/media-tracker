import { Injectable } from '@angular/core';
import { db } from '../database.service';
import { SyncBaseService } from './sync-base.service';
import { WatchSource } from '../../models/watch-source.model';

@Injectable({
  providedIn: 'root'
})
export class WatchSourceSyncService extends SyncBaseService<WatchSource> {
  protected override tableName = 'watch_sources';
  protected override entityType = 'WatchSource';

  async sync(lastSyncedAt?: Date) {
    const localSources = await db.watchSources.toArray();
    await this.syncEntity(localSources, lastSyncedAt);
  }

  protected override async handleMissingLocal(remote: any) {
    await db.watchSources.add({
      supabaseId: remote.id,
      name: remote.name,
      baseUrl: remote.base_url,
      isDeleted: remote.is_deleted,
      version: remote.version,
      createdAt: new Date(remote.created_at),
      updatedAt: new Date(remote.updated_at)
    } as WatchSource);
  }

  protected override async pullRemote(localId: number, remote: any) {
    await db.watchSources.update(localId, {
      name: remote.name,
      baseUrl: remote.base_url,
      isDeleted: remote.is_deleted,
      version: remote.version,
      updatedAt: new Date(remote.updated_at)
    });
  }

  protected override mapToSupabase(local: WatchSource) {
    return {
      name: local.name,
      base_url: local.baseUrl,
      is_deleted: !!local.isDeleted,
      updated_at: local.updatedAt.toISOString()
    };
  }

  protected override async handleNewLocal(local: WatchSource) {
    const user = (await this.supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([{
        ...this.mapToSupabase(local),
        user_id: user.id,
        version: 1,
        created_at: local.createdAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting watch source:', error);
    } else {
      await db.watchSources.update(local.id!, { supabaseId: data.id, version: data.version });
    }
  }
}
