import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { EpisodeProgress } from '../../models/media-run.model';

@Injectable({
  providedIn: 'root'
})
export class EpisodeProgressSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    console.log('Syncing episode progress...');
    const localProgress = await db.episodeProgress.toArray();
    const { data: remoteProgress, error } = await this.supabase
      .from('episode_progress')
      .select('*');

    if (error) {
      console.error('Error fetching remote episode progress:', error);
      return;
    }

    const mediaRuns = await db.mediaRuns.toArray();
    const mapLocalToSupabaseRunId = (localId: number) => mediaRuns.find(r => r.id === localId)?.supabaseId;
    const mapSupabaseToLocalRunId = (supabaseId: number) => mediaRuns.find(r => r.supabaseId === supabaseId)?.id;

    for (const local of localProgress) {
      const supabaseRunId = mapLocalToSupabaseRunId(local.runId);
      if (!supabaseRunId) continue;

      let remote = remoteProgress?.find(r => r.id === local.supabaseId);

      // Natural key match for episode progress is (run_id, episode_number)
      if (!remote && !local.supabaseId) {
        remote = remoteProgress?.find(r => 
          r.run_id === supabaseRunId && 
          r.episode_number === local.episodeNumber
        );
        if (remote) {
          await db.episodeProgress.update(local.id!, { supabaseId: remote.id });
          local.supabaseId = remote.id;
        }
      }

      if (!remote) {
        if (local.supabaseId) {
          // Deleted on remote
          await db.episodeProgress.delete(local.id!);
          continue;
        }

        // Push new local progress
        const { data, error: insertError } = await this.supabase
          .from('episode_progress')
          .insert([{
            run_id: supabaseRunId,
            episode_number: local.episodeNumber,
            watched_at: local.watchedAt.toISOString(),
            created_at: local.createdAt.toISOString()
          }])
          .select()
          .single();

        if (insertError) console.error('Error inserting episode progress:', insertError);
        else {
          await db.episodeProgress.update(local.id!, { 
            supabaseId: data.id, 
            lastSyncedAt: new Date() 
          });
        }
      } else {
        // Already exists, just update lastSyncedAt if needed
        if (!local.lastSyncedAt) {
          await db.episodeProgress.update(local.id!, { lastSyncedAt: new Date() });
        }
      }
    }

    // Pull new remote progress
    for (const remote of remoteProgress || []) {
      const local = localProgress.find(l => l.supabaseId === remote.id);
      if (!local) {
        const localRunId = mapSupabaseToLocalRunId(remote.run_id);
        if (localRunId) {
          // Double check if we already have this episode number for this run but with different ID
          const existingLocal = localProgress.find(l => l.runId === localRunId && l.episodeNumber === remote.episode_number);
          if (!existingLocal) {
            await db.episodeProgress.add({
              supabaseId: remote.id,
              runId: localRunId,
              episodeNumber: remote.episode_number,
              watchedAt: new Date(remote.watched_at),
              createdAt: new Date(remote.created_at),
              lastSyncedAt: new Date()
            });
          } else if (!existingLocal.supabaseId) {
            await db.episodeProgress.update(existingLocal.id!, { supabaseId: remote.id, lastSyncedAt: new Date() });
          }
        }
      }
    }
  }
}
