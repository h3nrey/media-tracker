import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { ChapterProgress } from '../../models/media-run.model';

@Injectable({
  providedIn: 'root'
})
export class ChapterProgressSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    console.log('Syncing chapter progress...');
    const localProgress = await db.chapterProgress.toArray();
    const { data: remoteProgress, error } = await this.supabase
      .from('chapter_progress')
      .select('*');

    if (error) {
      console.error('Error fetching remote chapter progress:', error);
      return;
    }

    const mediaRuns = await db.mediaRuns.toArray();
    const mapLocalToSupabaseRunId = (localId: number) => mediaRuns.find(r => r.id === localId)?.supabaseId;
    const mapSupabaseToLocalRunId = (supabaseId: number) => mediaRuns.find(r => r.supabaseId === supabaseId)?.id;

    for (const local of localProgress) {
      const supabaseRunId = mapLocalToSupabaseRunId(local.runId);
      if (!supabaseRunId) continue;

      let remote = remoteProgress?.find(r => r.id === local.supabaseId);

      // Natural key match for chapter progress is (run_id, chapter_number)
      if (!remote && !local.supabaseId) {
        remote = remoteProgress?.find(r => 
          r.run_id === supabaseRunId && 
          r.chapter_number === local.chapterNumber
        );
        if (remote) {
          await db.chapterProgress.update(local.id!, { supabaseId: remote.id });
          local.supabaseId = remote.id;
        }
      }

      if (!remote) {
        if (local.supabaseId) {
          await db.chapterProgress.delete(local.id!);
          continue;
        }

        const { data, error: insertError } = await this.supabase
          .from('chapter_progress')
          .insert([{
            run_id: supabaseRunId,
            chapter_number: local.chapterNumber,
            read_at: local.readAt.toISOString(),
            created_at: local.createdAt.toISOString()
          }])
          .select()
          .single();

        if (insertError) console.error('Error inserting chapter progress:', insertError);
        else {
          await db.chapterProgress.update(local.id!, { 
            supabaseId: data.id, 
            lastSyncedAt: new Date() 
          });
        }
      } else {
        if (!local.lastSyncedAt) {
          await db.chapterProgress.update(local.id!, { lastSyncedAt: new Date() });
        }
      }
    }

    for (const remote of remoteProgress || []) {
      const local = localProgress.find(l => l.supabaseId === remote.id);
      if (!local) {
        const localRunId = mapSupabaseToLocalRunId(remote.run_id);
        if (localRunId) {
          const existingLocal = localProgress.find(l => l.runId === localRunId && l.chapterNumber === remote.chapter_number);
          if (!existingLocal) {
            await db.chapterProgress.add({
              supabaseId: remote.id,
              runId: localRunId,
              chapterNumber: remote.chapter_number,
              readAt: new Date(remote.read_at),
              createdAt: new Date(remote.created_at),
              lastSyncedAt: new Date()
            });
          } else if (!existingLocal.supabaseId) {
            await db.chapterProgress.update(existingLocal.id!, { supabaseId: remote.id, lastSyncedAt: new Date() });
          }
        }
      }
    }
  }
}
