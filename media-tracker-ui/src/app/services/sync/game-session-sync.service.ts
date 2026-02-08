import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { GameSession } from '../../models/media-run.model';

@Injectable({
  providedIn: 'root'
})
export class GameSessionSyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    console.log('Syncing game sessions...');
    const localSessions = await db.gameSessions.toArray();
    const { data: remoteSessions, error } = await this.supabase
      .from('game_sessions')
      .select('*');

    if (error) {
      console.error('Error fetching remote game sessions:', error);
      return;
    }

    const mediaRuns = await db.mediaRuns.toArray();
    const mapLocalToSupabaseRunId = (localId: number) => mediaRuns.find(r => r.id === localId)?.supabaseId;
    const mapSupabaseToLocalRunId = (supabaseId: number) => mediaRuns.find(r => r.supabaseId === supabaseId)?.id;

    for (const local of localSessions) {
      const supabaseRunId = mapLocalToSupabaseRunId(local.runId);
      if (!supabaseRunId) continue;

      let remote = remoteSessions?.find(r => r.id === local.supabaseId);

      // Natural key for sessions is (run_id, played_at)
      if (!remote && !local.supabaseId) {
        remote = remoteSessions?.find(r => 
          r.run_id === supabaseRunId && 
          new Date(r.played_at).getTime() === new Date(local.playedAt).getTime()
        );
        if (remote) {
          await db.gameSessions.update(local.id!, { supabaseId: remote.id });
          local.supabaseId = remote.id;
        }
      }

      const supabaseData = {
        run_id: supabaseRunId,
        played_at: local.playedAt.toISOString(),
        duration_minutes: local.durationMinutes,
        notes: local.notes,
        updated_at: local.updatedAt.toISOString()
      };

      if (!remote) {
        if (local.supabaseId) {
          await db.gameSessions.delete(local.id!);
          continue;
        }

        const { data, error: insertError } = await this.supabase
          .from('game_sessions')
          .insert([{ ...supabaseData, created_at: local.createdAt.toISOString() }])
          .select()
          .single();

        if (insertError) console.error('Error inserting game session:', insertError);
        else {
          await db.gameSessions.update(local.id!, { 
            supabaseId: data.id, 
            lastSyncedAt: new Date() 
          });
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        const localIsNewer = local.updatedAt > remoteUpdatedAt;
        const localHasChanges = !local.lastSyncedAt || local.updatedAt > local.lastSyncedAt;
        const remoteHasChanges = !local.lastSyncedAt || remoteUpdatedAt > local.lastSyncedAt;

        if (localIsNewer && localHasChanges) {
          await this.supabase.from('game_sessions').update(supabaseData).eq('id', local.supabaseId);
          await db.gameSessions.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteHasChanges) {
          await db.gameSessions.update(local.id!, {
            supabaseId: remote.id,
            playedAt: new Date(remote.played_at),
            durationMinutes: remote.duration_minutes,
            notes: remote.notes,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date(),
          });
        }
      }
    }

    // Pull new remote sessions
    for (const remote of remoteSessions || []) {
      const local = localSessions.find(l => l.supabaseId === remote.id);
      if (!local) {
        const localRunId = mapSupabaseToLocalRunId(remote.run_id);
        if (localRunId) {
          await db.gameSessions.add({
            supabaseId: remote.id,
            runId: localRunId,
            playedAt: new Date(remote.played_at),
            durationMinutes: remote.duration_minutes,
            notes: remote.notes,
            createdAt: new Date(remote.created_at),
            updatedAt: new Date(remote.updated_at),
            lastSyncedAt: new Date()
          });
        }
      }
    }
  }
}
