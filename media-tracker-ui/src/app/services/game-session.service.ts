import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map } from 'rxjs';
import { GameSession } from '../models/media-run.model';
import { SupabaseService } from './supabase.service';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class GameSessionService {
  private supabaseService = inject(SupabaseService);
  private mediaService = inject(MediaService);

  private mapFromSupabase(item: any): GameSession {
    return {
      id: item.id,
      supabaseId: item.id,
      runId: item.run_id,
      playedAt: new Date(item.played_at),
      durationMinutes: item.duration_minutes,
      notes: item.notes,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  /**
   * Get all sessions for a specific run
   */
  getSessionsForRun$(runId: number): Observable<GameSession[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getSessionsForRun(runId)))
    );
  }

  /**
   * Get all sessions for a specific run (promise version)
   */
  async getSessionsForRun(runId: number): Promise<GameSession[]> {
    const { data, error } = await this.supabaseService.client
      .from('game_sessions')
      .select('*')
      .eq('run_id', runId)
      .order('played_at', { ascending: false });
    
    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(id: number): Promise<GameSession | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('game_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return this.mapFromSupabase(data);
  }

  /**
   * Calculate total hours played for a run
   */
  async getTotalHoursForRun(runId: number): Promise<number> {
    const sessions = await this.getSessionsForRun(runId);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return totalMinutes / 60;
  }

  /**
   * Get total hours played across all runs for a media item
   */
  async getTotalHoursForMedia(mediaItemId: number): Promise<number> {
    const { data: runs, error: runError } = await this.supabaseService.client
      .from('media_runs')
      .select('id')
      .eq('media_item_id', mediaItemId)
      .eq('is_deleted', false);

    if (runError || !runs) return 0;
    
    let totalMinutes = 0;
    for (const run of runs) {
      const sessions = await this.getSessionsForRun(run.id);
      totalMinutes += sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    }
    
    return totalMinutes / 60;
  }

  /**
   * Create a new game session
   */
  async createSession(session: Omit<GameSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const supabaseData = {
      run_id: session.runId,
      played_at: session.playedAt.toISOString(),
      duration_minutes: session.durationMinutes,
      notes: session.notes
    };

    const { data, error } = await this.supabaseService.client
      .from('game_sessions')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  /**
   * Log a new game session with duration
   */
  async logSession(runId: number, durationMinutes: number, notes?: string): Promise<number> {
    return this.createSession({
      runId,
      playedAt: new Date(),
      durationMinutes,
      notes
    });
  }

  /**
   * Update an existing session
   */
  async updateSession(id: number, updates: Partial<GameSession>): Promise<number> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.playedAt !== undefined) supabaseData.played_at = updates.playedAt.toISOString();
    if (updates.durationMinutes !== undefined) supabaseData.duration_minutes = updates.durationMinutes;
    if (updates.notes !== undefined) supabaseData.notes = updates.notes;

    const { error } = await this.supabaseService.client
      .from('game_sessions')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return id;
  }

  /**
   * Delete a session
   */
  async deleteSession(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('game_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
  }

  /**
   * Get session statistics for a run
   */
  async getSessionStats(runId: number): Promise<{
    totalSessions: number;
    totalHours: number;
    averageSessionLength: number;
    longestSession: number;
    shortestSession: number;
  }> {
    const sessions = await this.getSessionsForRun(runId);
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalHours: 0,
        averageSessionLength: 0,
        longestSession: 0,
        shortestSession: 0
      };
    }

    const durations = sessions.map(s => s.durationMinutes);
    const totalMinutes = durations.reduce((sum, d) => sum + d, 0);

    return {
      totalSessions: sessions.length,
      totalHours: totalMinutes / 60,
      averageSessionLength: totalMinutes / sessions.length,
      longestSession: Math.max(...durations),
      shortestSession: Math.min(...durations)
    };
  }

  /**
   * Get recent sessions across all runs
   */
  async getRecentSessions(limit: number = 10): Promise<GameSession[]> {
    const { data, error } = await this.supabaseService.client
      .from('game_sessions')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(limit);
    
    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }
}
