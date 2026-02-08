import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { liveQuery } from 'dexie';
import { db } from './database.service';
import { EpisodeProgress } from '../models/media-run.model';
import { SyncService } from './sync.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class EpisodeProgressService {
  private syncService = inject(SyncService);
  private supabaseService = inject(SupabaseService);

  /**
   * Get all watched episodes for a specific run
   */
  getEpisodesForRun$(runId: number): Observable<EpisodeProgress[]> {
    return from(liveQuery(async () => {
      const episodes = await db.episodeProgress
        .where('runId')
        .equals(runId)
        .toArray();
      
      return episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    }));
  }


  async getEpisodesForRun(runId: number): Promise<EpisodeProgress[]> {
    const episodes = await db.episodeProgress
      .where('runId')
      .equals(runId)
      .toArray();
    
    return episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  async isEpisodeWatched(runId: number, episodeNumber: number): Promise<boolean> {
    const episode = await db.episodeProgress
      .where(['runId', 'episodeNumber'])
      .equals([runId, episodeNumber])
      .first();
    
    return !!episode;
  }

  async markEpisodeWatched(runId: number, episodeNumber: number): Promise<number> {
    const now = new Date();

    const existing = await db.episodeProgress
      .where('[runId+episodeNumber]')
      .equals([runId, episodeNumber])
      .first();
    
    if (existing) {
      return existing.id!;
    }

    const id = await db.episodeProgress.add({
      runId,
      episodeNumber,
      watchedAt: now,
      createdAt: now
    } as EpisodeProgress);

    this.syncService.sync();
    return id as number;
  }

  async markEpisodeUnwatched(runId: number, episodeNumber: number): Promise<void> {
    console.log('[EpisodeProgressService] markEpisodeUnwatched called:', { runId, episodeNumber });
    
    // Find using compound index
    const episode = await db.episodeProgress
      .where('[runId+episodeNumber]')
      .equals([runId, episodeNumber])
      .first();
    
    if (episode?.id) {
      console.log('[EpisodeProgressService] Deleting episode:', episode);
      
      // Delete from Supabase first if it has a supabaseId
      if (episode.supabaseId) {
        console.log('[EpisodeProgressService] Deleting from Supabase:', episode.supabaseId);
        const { error } = await this.supabaseService.client
          .from('episode_progress')
          .delete()
          .eq('id', episode.supabaseId);
        
        if (error) {
          console.error('[EpisodeProgressService] Error deleting from Supabase:', error);
        }
      }
      
      // Then delete locally
      await db.episodeProgress.delete(episode.id);
    } else {
      console.log('[EpisodeProgressService] Episode not found to delete');
    }
  }

  async markNextEpisodeWatched(runId: number): Promise<number | null> {
    const watchedEpisodes = await this.getEpisodesForRun(runId);
    const watchedNumbers = watchedEpisodes.map(e => e.episodeNumber);
    
    let nextEpisode = 1;
    while (watchedNumbers.includes(nextEpisode)) {
      nextEpisode++;
    }
    
    return this.markEpisodeWatched(runId, nextEpisode);
  }

  async getProgressStats(runId: number, totalEpisodes?: number): Promise<{
    episodesWatched: number;
    episodesTotal: number | null;
    progressPercentage: number;
    lastWatchedEpisode: number | null;
    nextEpisodeToWatch: number;
  }> {
    const episodes = await this.getEpisodesForRun(runId);
    const episodesWatched = episodes.length;
    const watchedNumbers = episodes.map(e => e.episodeNumber);
    const lastWatched = watchedNumbers.length > 0 ? Math.max(...watchedNumbers) : null;
    
    let nextEpisode = 1;
    while (watchedNumbers.includes(nextEpisode)) {
      nextEpisode++;
    }

    const progressPercentage = totalEpisodes && totalEpisodes > 0
      ? (episodesWatched / totalEpisodes) * 100
      : 0;

    return {
      episodesWatched,
      episodesTotal: totalEpisodes || null,
      progressPercentage,
      lastWatchedEpisode: lastWatched,
      nextEpisodeToWatch: nextEpisode
    };
  }

  async markEpisodesWatched(runId: number, episodeNumbers: number[]): Promise<void> {
    const now = new Date();
    
    for (const episodeNumber of episodeNumbers) {
      const existing = await db.episodeProgress
        .where(['runId', 'episodeNumber'])
        .equals([runId, episodeNumber])
        .first();
      
      if (!existing) {
        await db.episodeProgress.add({
          runId,
          episodeNumber,
          watchedAt: now,
          createdAt: now
        } as EpisodeProgress);
      }
    }

    this.syncService.sync();
  }

  async markEpisodeRangeWatched(runId: number, fromEpisode: number, toEpisode: number): Promise<void> {
    const episodes = Array.from(
      { length: toEpisode - fromEpisode + 1 }, 
      (_, i) => fromEpisode + i
    );
    
    await this.markEpisodesWatched(runId, episodes);
  }

  async getWatchHistory(runId: number): Promise<EpisodeProgress[]> {
    const episodes = await this.getEpisodesForRun(runId);
    return episodes.sort((a, b) => 
      new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
    );
  }

  async clearProgress(runId: number): Promise<void> {
    const episodes = await this.getEpisodesForRun(runId);
    const ids = episodes.map(e => e.id!).filter(id => !!id);
    const supabaseIds = episodes.map(e => e.supabaseId).filter(id => !!id);
    
    if (supabaseIds.length > 0) {
      const { error } = await this.supabaseService.client
        .from('episode_progress')
        .delete()
        .in('id', supabaseIds);
      
      if (error) {
        console.error('[EpisodeProgressService] Error deleting from Supabase:', error);
      }
    }
    
    await db.episodeProgress.bulkDelete(ids);
  }
}
