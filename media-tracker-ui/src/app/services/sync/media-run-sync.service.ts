import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { MediaRun } from '../../models/media-run.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class MediaRunSyncService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  async sync() {
    const user = this.authService.currentUser();
    if (!user) return;

    console.log('Syncing media runs...');
    const localRuns = await db.mediaRuns.toArray();
    
    // Safety: Deduplicate local runs before syncing
    // If we have two active local runs with same number/mediaItem, keep only the most recent one
    for (const local of localRuns.filter(r => !r.isDeleted)) {
      const duplicates = localRuns.filter(r => 
        !r.isDeleted && 
        r.id !== local.id && 
        r.mediaItemId === local.mediaItemId && 
        r.runNumber === local.runNumber
      );
      
      if (duplicates.length > 0) {
        for (const dup of duplicates) {
          if (local.updatedAt >= dup.updatedAt) {
            await db.mediaRuns.delete(dup.id!);
          }
        }
      }
    }

    const { data: remoteRuns, error } = await this.supabase
      .from('media_runs')
      .select('*');

    if (error) {
      console.error('Error fetching remote runs:', error);
      return;
    }

    const mediaItems = await db.mediaItems.toArray();
    const mapLocalToSupabaseMediaId = (localId: number) => mediaItems.find(m => m.id === localId)?.supabaseId;
    const mapSupabaseToLocalMediaId = (supabaseId: number) => mediaItems.find(m => m.supabaseId === supabaseId)?.id;

    for (const local of localRuns) {
      const supabaseMediaId = mapLocalToSupabaseMediaId(local.mediaItemId);
      if (!supabaseMediaId) continue; // Media item not synced yet

      let remote = remoteRuns?.find(r => r.id === local.supabaseId);
      
      // Try natural key match if no supabaseId
      if (!remote && !local.supabaseId) {
        remote = remoteRuns?.find(r => 
          r.media_item_id === supabaseMediaId && 
          r.run_number === local.runNumber
        );
        if (remote) {
          await db.mediaRuns.update(local.id!, { supabaseId: remote.id });
          local.supabaseId = remote.id;
        }
      }

      const supabaseData = {
        user_id: user.id,
        media_item_id: supabaseMediaId,
        run_number: local.runNumber,
        start_date: local.startDate?.toISOString(),
        end_date: local.endDate?.toISOString(),
        rating: local.rating,
        notes: local.notes,
        is_deleted: !!local.isDeleted,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (local.supabaseId) {
          // Deleted on remote
          await db.mediaRuns.delete(local.id!);
          continue;
        }

        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('media_runs')
            .insert([{ ...supabaseData, created_at: local.createdAt.toISOString() }])
            .select()
            .single();

          if (insertError) console.error('Error inserting media run:', insertError);
          else {
            await db.mediaRuns.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        const localIsNewer = local.updatedAt > remoteUpdatedAt;
        const localHasChanges = !local.lastSyncedAt || local.updatedAt > local.lastSyncedAt;
        const remoteHasChanges = !local.lastSyncedAt || remoteUpdatedAt > local.lastSyncedAt;

        if (localIsNewer && localHasChanges) {
          await this.supabase.from('media_runs').update(supabaseData).eq('id', local.supabaseId);
          await db.mediaRuns.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteHasChanges) {
          await db.mediaRuns.update(local.id!, {
            supabaseId: remote.id,
            runNumber: remote.run_number,
            startDate: remote.start_date ? new Date(remote.start_date) : undefined,
            endDate: remote.end_date ? new Date(remote.end_date) : undefined,
            rating: remote.rating,
            notes: remote.notes,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date(),
          });
        }
      }
    }

    // Pull new remote runs
    for (const remote of remoteRuns || []) {
      const local = localRuns.find(l => l.supabaseId === remote.id);
      if (!local) {
        const localMediaId = mapSupabaseToLocalMediaId(remote.media_item_id);
        if (localMediaId) {
          await db.mediaRuns.add({
            supabaseId: remote.id,
            userId: remote.user_id,
            mediaItemId: localMediaId,
            runNumber: remote.run_number,
            startDate: remote.start_date ? new Date(remote.start_date) : undefined,
            endDate: remote.end_date ? new Date(remote.end_date) : undefined,
            rating: remote.rating,
            notes: remote.notes,
            isDeleted: remote.is_deleted,
            createdAt: new Date(remote.created_at),
            updatedAt: new Date(remote.updated_at),
            lastSyncedAt: new Date()
          });
        }
      }
    }
  }
}
