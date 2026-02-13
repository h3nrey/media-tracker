import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { GameSession } from '../../models/media-run.model';

@Injectable({
  providedIn: 'root'
})
export class GameSessionSyncService {
  private supabase = inject(SupabaseService).client;

  async sync(lastSyncedAt?: Date) {
    console.log('Syncing game sessions...');
    const localSessions = await db.gameSessions.toArray();
    
    const { data: remoteSessions, error } = await this.supabase
      .from('game_sessions')
      .select('*');

    if (error) throw error;

    const mediaRuns = await db.mediaRuns.toArray();
    const mapLocalToSupabaseRunId = (localId: number) => mediaRuns.find(r => r.id === localId)?.supabaseId;
    const mapSupabaseToLocalRunId = (supabaseId: number) => mediaRuns.find(r => r.supabaseId === supabaseId)?.id;

    for (const remote of remoteSessions || []) {
      const local = localSessions.find(l => l.supabaseId === remote.id);
      const localRunId = mapSupabaseToLocalRunId(remote.run_id);
      
      if (!localRunId) continue;

      const sessionData = {
        supabaseId: remote.id,
        runId: localRunId,
        playedAt: new Date(remote.played_at),
        durationMinutes: remote.duration_minutes,
        notes: remote.notes,
        createdAt: new Date(remote.created_at),
        updatedAt: new Date(remote.updated_at)
      };

      if (!local) {
        const existingNatural = localSessions.find(l => 
          !l.supabaseId && 
          l.runId === localRunId && 
          l.playedAt.toISOString() === new Date(remote.played_at).toISOString()
        );

        if (existingNatural) {
          await db.gameSessions.update(existingNatural.id!, sessionData);
        } else {
          await db.gameSessions.add(sessionData);
        }
      } else {
        await db.gameSessions.update(local.id!, sessionData);
      }
    }

    const sessionsToPush = localSessions.filter(l => !l.supabaseId);

    for (const local of sessionsToPush) {
      const supabaseRunId = mapLocalToSupabaseRunId(local.runId);
      if (!supabaseRunId) continue;

      const { data: existing } = await this.supabase
        .from('game_sessions')
        .select('id')
        .eq('run_id', supabaseRunId)
        .eq('played_at', local.playedAt.toISOString())
        .maybeSingle();

      if (existing) {
        await db.gameSessions.update(local.id!, { supabaseId: existing.id });
        continue;
      }

      const { data, error: insertError } = await this.supabase
        .from('game_sessions')
        .insert([{
          run_id: supabaseRunId,
          played_at: local.playedAt.toISOString(),
          duration_minutes: local.durationMinutes,
          notes: local.notes,
          created_at: local.createdAt.toISOString(),
          updated_at: local.updatedAt.toISOString()
        }])
        .select()
        .single();

      if (insertError) console.error('Error inserting game session:', insertError);
      else {
        await db.gameSessions.update(local.id!, { supabaseId: data.id });
      }
    }
  }
}
