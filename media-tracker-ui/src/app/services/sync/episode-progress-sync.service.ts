import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { EpisodeProgress } from '../../models/media-run.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
@Injectable({
  providedIn: 'root'
})
export class EpisodeProgressSyncService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  async sync(lastSyncedAt?: Date) {
    console.log('Syncing episode progress...');
    const localProgress = await db.episodeProgress.toArray();
    
    const { data: remoteProgress, error } = await this.supabase
      .from('episode_progress')
      .select('*')
      .eq('user_id', this.authService.currentUser()?.id);

    if (error) throw error;

    const mediaRuns = await db.mediaRuns.toArray();
    const mapLocalToSupabaseRunId = (localId: number) => mediaRuns.find(r => r.id === localId)?.supabaseId;
    const mapSupabaseToLocalRunId = (supabaseId: number) => mediaRuns.find(r => r.supabaseId === supabaseId)?.id;

    for (const remote of remoteProgress || []) {
      const local = localProgress.find(l => l.supabaseId === remote.id);
      const localRunId = mapSupabaseToLocalRunId(remote.run_id);
      
      if (!localRunId) continue;

      const progressData: EpisodeProgress = {
        supabaseId: remote.id,
        runId: localRunId,
        episodeNumber: remote.episode_number,
        watchedAt: new Date(remote.watched_at),
        createdAt: new Date(remote.created_at),
        updatedAt: new Date(remote.updated_at)
      };

      if (!local) {
        const existingNatural = localProgress.find(l => 
          !l.supabaseId && 
          l.runId === localRunId && 
          l.episodeNumber === remote.episode_number
        );

        if (existingNatural) {
          await db.episodeProgress.update(existingNatural.id!, progressData);
        } else {
          await db.episodeProgress.add(progressData);
        }
      } else {
        await db.episodeProgress.update(local.id!, progressData);
      }
    }

    const progressToPush = localProgress.filter(l => !l.supabaseId);

    for (const local of progressToPush) {
      const supabaseRunId = mapLocalToSupabaseRunId(local.runId);
      if (!supabaseRunId) continue;

      const { data: existing } = await this.supabase
        .from('episode_progress')
        .select('id')
        .eq('run_id', supabaseRunId)
        .eq('episode_number', local.episodeNumber)
        .eq('user_id', this.authService.currentUser()?.id)
        .maybeSingle();

      if (existing) {
        await db.episodeProgress.update(local.id!, { supabaseId: existing.id });
        continue;
      }

      const { data, error: insertError } = await this.supabase
        .from('episode_progress')
        .insert([{
          run_id: supabaseRunId,
          episode_number: local.episodeNumber,
          watched_at: local.watchedAt.toISOString(),
          created_at: local.createdAt.toISOString(),
          updated_at: (local.updatedAt || local.createdAt).toISOString(),
          user_id: this.authService.currentUser()?.id
        }])
        .select()
        .single();

      if (insertError) console.error('Error inserting episode progress:', insertError);
      else {
        await db.episodeProgress.update(local.id!, { supabaseId: data.id });
      }
    }
  }
}
