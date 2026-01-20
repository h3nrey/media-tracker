import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { MediaLog } from '../../models/media-log.model';

@Injectable({
  providedIn: 'root'
})
export class MediaLogSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    console.log('Syncing media logs...');
    const localLogs = await db.mediaLogs.toArray();
    const { data: remoteLogs, error } = await this.supabase
      .from('media_logs')
      .select('*');
    
    if (error) {
      console.error('Error fetching remote logs:', error);
      return;
    }

    const mediaItems = await db.mediaItems.toArray();
    const mapLocalToSupabaseMediaId = (localId: number) => mediaItems.find(m => m.id === localId)?.supabaseId;
    const mapSupabaseToLocalMediaId = (supabaseId: number) => mediaItems.find(m => m.supabaseId === supabaseId)?.id;

    for (const local of localLogs) {
      const remote = remoteLogs?.find(r => r.id === local.supabaseId);
      
      const normalizeDate = (d: any) => {
        if (!d) return null;
        const date = new Date(d);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Store as YYYY-MM-DD
      };

      const supabaseData = {
        media_item_id: mapLocalToSupabaseMediaId(local.mediaItemId),
        start_date: normalizeDate(local.startDate),
        end_date: normalizeDate(local.endDate),
        is_deleted: !!local.isDeleted,
        updated_at: (local.updatedAt instanceof Date ? local.updatedAt : new Date(local.updatedAt!)).toISOString()
      };

      if (!supabaseData.media_item_id) continue; // Skip if parent item not yet synced

      if (!remote) {
        if (local.supabaseId) {
          // Deleted on remote - remove locally
          await db.mediaLogs.delete(local.id!);
          continue;
        }

        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('media_logs')
            .insert([{ 
              ...supabaseData, 
              created_at: (local.createdAt instanceof Date ? local.createdAt : new Date(local.createdAt!)).toISOString() 
            }])
            .select()
            .single();

          if (insertError) console.error('Error inserting log:', insertError);
          else {
            await db.mediaLogs.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        const localUpdatedAt = local.updatedAt instanceof Date ? local.updatedAt : new Date(local.updatedAt!);
        
        // Offline-first resolution
        const localIsNewer = localUpdatedAt > remoteUpdatedAt;
        const remoteIsNewer = remoteUpdatedAt > localUpdatedAt;
        const localHasChanges = !local.lastSyncedAt || localUpdatedAt > local.lastSyncedAt;
        const remoteHasChanges = !local.lastSyncedAt || remoteUpdatedAt > local.lastSyncedAt;

        if (localIsNewer && localHasChanges) {
          await this.supabase.from('media_logs').update(supabaseData).eq('id', local.supabaseId);
          await db.mediaLogs.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteIsNewer && remoteHasChanges) {
          await db.mediaLogs.update(local.id!, {
            startDate: remote.start_date ? new Date(remote.start_date) : undefined,
            endDate: remote.end_date ? new Date(remote.end_date) : undefined,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    // Pull new logs
    for (const remote of remoteLogs || []) {
      const local = localLogs.find(l => l.supabaseId === remote.id);
      if (!local) {
        const localMediaId = mapSupabaseToLocalMediaId(remote.media_item_id);
        if (localMediaId) {
          await db.mediaLogs.add({
            supabaseId: remote.id,
            mediaItemId: localMediaId,
            startDate: remote.start_date ? new Date(remote.start_date) : undefined,
            endDate: remote.end_date ? new Date(remote.end_date) : undefined,
            isDeleted: remote.is_deleted,
            createdAt: new Date(remote.created_at),
            updatedAt: new Date(remote.updated_at),
            lastSyncedAt: new Date()
          } as MediaLog);
        }
      }
    }
  }
}
