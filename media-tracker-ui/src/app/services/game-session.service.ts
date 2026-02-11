import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { liveQuery } from 'dexie';
import { db } from './database.service';
import { GameSession } from '../models/media-run.model';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class GameSessionService {
  private syncService = inject(SyncService);

  /**
   * Get all sessions for a specific run
   */
  getSessionsForRun$(runId: number): Observable<GameSession[]> {
    return from(liveQuery(async () => {
      const sessions = await db.gameSessions
        .where('runId')
        .equals(runId)
        .toArray();
      
      return sessions.sort((a, b) => 
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
      );
    }));
  }

  /**
   * Get all sessions for a specific run (promise version)
   */
  async getSessionsForRun(runId: number): Promise<GameSession[]> {
    const sessions = await db.gameSessions
      .where('runId')
      .equals(runId)
      .toArray();
    
    return sessions.sort((a, b) => 
      new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(id: number): Promise<GameSession | undefined> {
    return await db.gameSessions.get(id);
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
    const runs = await db.mediaRuns
      .where('mediaItemId')
      .equals(mediaItemId)
      .toArray();
    
    let totalMinutes = 0;
    for (const run of runs.filter(r => !r.isDeleted)) {
      const sessions = await this.getSessionsForRun(run.id!);
      totalMinutes += sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    }
    
    return totalMinutes / 60;
  }

  /**
   * Create a new game session
   */
  async createSession(session: Omit<GameSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();

    const id = await db.gameSessions.add({
      ...session,
      createdAt: now,
      updatedAt: now
    } as GameSession);

    this.syncService.sync();
    return id as number;
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
    const now = new Date();
    
    const result = await db.gameSessions.update(id, {
      ...updates,
      updatedAt: now
    });

    this.syncService.sync();
    return result;
  }

  /**
   * Delete a session
   */
  async deleteSession(id: number): Promise<void> {
    await db.gameSessions.delete(id);
    this.syncService.sync();
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
    const allSessions = await db.gameSessions.toArray();
    
    return allSessions
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, limit);
  }
}
