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

  async sync(lastSyncedAt?: Date) {
    const user = this.authService.currentUser();
    if (!user) return;

    console.log('Syncing media runs...');
    const localRuns = await db.mediaRuns.toArray();
    
    const { data: remoteRuns, error } = await this.supabase
      .from('media_runs')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    const mediaItems = await db.mediaItems.toArray();
    const mapLocalToSupabaseMediaId = (localId: number) => mediaItems.find(m => m.id === localId)?.supabaseId;
    const mapSupabaseToLocalMediaId = (supabaseId: number) => mediaItems.find(m => m.supabaseId === supabaseId)?.id;

    for (const remote of remoteRuns || []) {
      const local = localRuns.find(l => l.supabaseId === remote.id);
      const localMediaId = mapSupabaseToLocalMediaId(remote.media_item_id);
      
      if (!localMediaId) continue;

      const runData: MediaRun = {
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
        updatedAt: new Date(remote.updated_at)
      };

      if (!local) {
        const existingNatural = localRuns.find(l => 
          !l.supabaseId && 
          l.mediaItemId === localMediaId && 
          l.runNumber === remote.run_number
        );

        if (existingNatural) {
          await db.mediaRuns.update(existingNatural.id!, runData);
        } else {
          await db.mediaRuns.add(runData);
        }
      } else {
        await db.mediaRuns.update(local.id!, runData);
      }
    }
    const newLocalRuns = await db.mediaRuns.where('supabaseId').equals(0).toArray();
    const runsToPush = localRuns.filter(l => !l.supabaseId && !l.isDeleted);

    for (const local of runsToPush) {
      const supabaseMediaId = mapLocalToSupabaseMediaId(local.mediaItemId);
      if (!supabaseMediaId) continue;

      const { data: existing } = await this.supabase
        .from('media_runs')
        .select('id')
        .eq('media_item_id', supabaseMediaId)
        .eq('run_number', local.runNumber)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await db.mediaRuns.update(local.id!, { supabaseId: existing.id });
        continue;
      }

      const { data, error: insertError } = await this.supabase
        .from('media_runs')
        .insert([{
          user_id: user.id,
          media_item_id: supabaseMediaId,
          run_number: local.runNumber,
          start_date: local.startDate?.toISOString(),
          end_date: local.endDate?.toISOString(),
          rating: local.rating,
          notes: local.notes,
          is_deleted: !!local.isDeleted,
          created_at: local.createdAt.toISOString(),
          updated_at: local.updatedAt.toISOString()
        }])
        .select()
        .single();

      if (insertError) console.error('Error inserting media run:', insertError);
      else {
        await db.mediaRuns.update(local.id!, { supabaseId: data.id });
      }
    }
  }
}
