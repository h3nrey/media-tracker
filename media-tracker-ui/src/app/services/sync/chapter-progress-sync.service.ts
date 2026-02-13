import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { ChapterProgress } from '../../models/media-run.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
@Injectable({
  providedIn: 'root'
})
export class ChapterProgressSyncService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  async sync(lastSyncedAt?: Date) {
    console.log('Syncing chapter progress...');
    const localProgress = await db.chapterProgress.toArray();
    
    const { data: remoteProgress, error } = await this.supabase
      .from('chapter_progress')
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

      const progressData: ChapterProgress = {
        supabaseId: remote.id,
        runId: localRunId,
        chapterNumber: remote.chapter_number,
        readAt: new Date(remote.read_at),
        createdAt: new Date(remote.created_at),
        updatedAt: new Date(remote.updated_at)
      };

      if (!local) {
        const existingNatural = localProgress.find(l => 
          !l.supabaseId && 
          l.runId === localRunId && 
          l.chapterNumber === remote.chapter_number
        );

        if (existingNatural) {
          await db.chapterProgress.update(existingNatural.id!, progressData);
        } else {
          await db.chapterProgress.add(progressData);
        }
      } else {
        await db.chapterProgress.update(local.id!, progressData);
      }
    }

    const progressToPush = localProgress.filter(l => !l.supabaseId);

    for (const local of progressToPush) {
      const supabaseRunId = mapLocalToSupabaseRunId(local.runId);
      if (!supabaseRunId) continue;

      const { data: existing } = await this.supabase
        .from('chapter_progress')
        .select('id')
        .eq('run_id', supabaseRunId)
        .eq('chapter_number', local.chapterNumber)
        .eq('user_id', this.authService.currentUser()?.id)
        .maybeSingle();

      if (existing) {
        await db.chapterProgress.update(local.id!, { supabaseId: existing.id });
        continue;
      }

      const { data, error: insertError } = await this.supabase
        .from('chapter_progress')
        .insert([{
          run_id: supabaseRunId,
          chapter_number: local.chapterNumber,
          read_at: local.readAt.toISOString(),
          created_at: local.createdAt.toISOString(),
          updated_at: (local.updatedAt || local.createdAt).toISOString(),
          user_id: this.authService.currentUser()?.id
        }])
        .select()
        .single();

      if (insertError) console.error('Error inserting chapter progress:', insertError);
      else {
        await db.chapterProgress.update(local.id!, { supabaseId: data.id });
      }
    }
  }
}
