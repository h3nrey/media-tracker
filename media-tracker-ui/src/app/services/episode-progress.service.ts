import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map } from 'rxjs';
import { EpisodeProgress } from '../models/media-run.model';
import { SupabaseService } from './supabase.service';
import { MediaService } from './media.service';
import { CategoryService } from './status.service';

@Injectable({
  providedIn: 'root'
})
export class EpisodeProgressService {
  private supabaseService = inject(SupabaseService);
  private mediaService = inject(MediaService);
  private categoryService = inject(CategoryService);

  private mapFromSupabase(item: any): EpisodeProgress {
    return {
      id: item.id,
      supabaseId: item.id,
      runId: item.run_id,
      episodeNumber: item.episode_number,
      watchedAt: new Date(item.watched_at),
      createdAt: new Date(item.created_at),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
    };
  }

  getEpisodesForRun$(runId: number): Observable<EpisodeProgress[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getEpisodesForRun(runId)))
    );
  }

  async getEpisodesForRun(runId: number): Promise<EpisodeProgress[]> {
    const { data, error } = await this.supabaseService.client
      .from('episode_progress')
      .select('*')
      .eq('run_id', runId)
      .order('episode_number', { ascending: true });
    
    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async isEpisodeWatched(runId: number, episodeNumber: number): Promise<boolean> {
    const { data, error } = await this.supabaseService.client
      .from('episode_progress')
      .select('id')
      .eq('run_id', runId)
      .eq('episode_number', episodeNumber)
      .maybeSingle();
    
    return !!data && !error;
  }

  async markEpisodeWatched(runId: number, episodeNumber: number): Promise<number> {
    const existing = await this.supabaseService.client
      .from('episode_progress')
      .select('id')
      .eq('run_id', runId)
      .eq('episode_number', episodeNumber)
      .maybeSingle();

    if (existing.data) return existing.data.id;

    const { data, error } = await this.supabaseService.client
      .from('episode_progress')
      .insert([{
        run_id: runId,
        episode_number: episodeNumber,
        watched_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await this.checkRunCompletion(runId);
    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  async checkRunCompletion(runId: number): Promise<void> {
    const { data: run, error: runError } = await this.supabaseService.client
      .from('media_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !run || run.end_date) return;

    const media = await this.mediaService.getMediaById(run.media_item_id);
    if (!media || !media.progressTotal) return;

    const watchedEpisodes = await this.getEpisodesForRun(runId);

    if (watchedEpisodes.length >= media.progressTotal) {
      const now = new Date().toISOString();
      
      await this.supabaseService.client
        .from('media_runs')
        .update({ end_date: now, updated_at: now })
        .eq('id', runId);

      const categories = await this.categoryService.getAllCategories();
      const completedCategory = categories.find(c => 
        ['completed', 'completado', 'finalizado', 'concluído'].includes(c.name.toLowerCase())
      );

      const updates: any = {
        progress_current: media.progressTotal,
        updated_at: now
      };

      if (completedCategory) {
        updates.status_id = completedCategory.id;
      }

      await this.supabaseService.client
        .from('media_items')
        .update(updates)
        .eq('id', media.id);
    }
  }

  async markEpisodeUnwatched(runId: number, episodeNumber: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('episode_progress')
      .delete()
      .eq('run_id', runId)
      .eq('episode_number', episodeNumber);
    
    if (error) console.error('Error deleting episode progress:', error);
    this.mediaService.triggerFilterUpdate();
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
    for (const episodeNumber of episodeNumbers) {
      await this.markEpisodeWatched(runId, episodeNumber);
    }
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
      b.watchedAt.getTime() - a.watchedAt.getTime()
    );
  }

  async clearProgress(runId: number): Promise<void> {
    await this.supabaseService.client
      .from('episode_progress')
      .delete()
      .eq('run_id', runId);

    this.mediaService.triggerFilterUpdate();
  }
}
