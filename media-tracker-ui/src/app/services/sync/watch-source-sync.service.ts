import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { WatchSource } from '../../models/watch-source.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class WatchSourceSyncService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  async sync() {
    const user = this.authService.currentUser()!;
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
              user_id: user.id,
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
              user_id: user.id,
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
}
