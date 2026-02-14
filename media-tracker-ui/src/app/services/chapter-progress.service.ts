import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map } from 'rxjs';
import { ChapterProgress } from '../models/media-run.model';
import { SupabaseService } from './supabase.service';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class ChapterProgressService {
  private supabaseService = inject(SupabaseService);
  private mediaService = inject(MediaService);

  private mapFromSupabase(item: any): ChapterProgress {
    return {
      id: item.id,
      supabaseId: item.id,
      runId: item.run_id,
      chapterNumber: item.chapter_number,
      readAt: new Date(item.read_at),
      createdAt: new Date(item.created_at),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
    };
  }

  getChaptersForRun$(runId: number): Observable<ChapterProgress[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getChaptersForRun(runId)))
    );
  }

  async getChaptersForRun(runId: number): Promise<ChapterProgress[]> {
    const { data, error } = await this.supabaseService.client
      .from('chapter_progress')
      .select('*')
      .eq('run_id', runId)
      .order('chapter_number', { ascending: true });
    
    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async isChapterRead(runId: number, chapterNumber: number): Promise<boolean> {
    const { data, error } = await this.supabaseService.client
      .from('chapter_progress')
      .select('id')
      .eq('run_id', runId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle();
    
    return !!data && !error;
  }

  async markChapterRead(runId: number, chapterNumber: number): Promise<number> {
    const existing = await this.supabaseService.client
      .from('chapter_progress')
      .select('id')
      .eq('run_id', runId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle();

    if (existing.data) return existing.data.id;

    const { data, error } = await this.supabaseService.client
      .from('chapter_progress')
      .insert([{
        run_id: runId,
        chapter_number: chapterNumber,
        read_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  async markChapterUnread(runId: number, chapterNumber: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('chapter_progress')
      .delete()
      .eq('run_id', runId)
      .eq('chapter_number', chapterNumber);
    
    if (error) console.error('Error deleting chapter progress:', error);
    this.mediaService.triggerFilterUpdate();
  }

  async markNextChapterRead(runId: number): Promise<number | null> {
    const readChapters = await this.getChaptersForRun(runId);
    const readNumbers = readChapters.map(c => c.chapterNumber);
    
    let nextChapter = 1;
    while (readNumbers.includes(nextChapter)) {
      nextChapter++;
    }
    
    return this.markChapterRead(runId, nextChapter);
  }

  async getProgressStats(runId: number, totalChapters?: number): Promise<{
    chaptersRead: number;
    chaptersTotal: number | null;
    progressPercentage: number;
    lastReadChapter: number | null;
    nextChapterToRead: number;
  }> {
    const chapters = await this.getChaptersForRun(runId);
    const chaptersRead = chapters.length;
    const readNumbers = chapters.map(c => c.chapterNumber);
    const lastRead = readNumbers.length > 0 ? Math.max(...readNumbers) : null;
    
    let nextChapter = 1;
    while (readNumbers.includes(nextChapter)) {
      nextChapter++;
    }

    const progressPercentage = totalChapters && totalChapters > 0
      ? (chaptersRead / totalChapters) * 100
      : 0;

    return {
      chaptersRead,
      chaptersTotal: totalChapters || null,
      progressPercentage,
      lastReadChapter: lastRead,
      nextChapterToRead: nextChapter
    };
  }

  async markChaptersRead(runId: number, chapterNumbers: number[]): Promise<void> {
    for (const chapterNumber of chapterNumbers) {
      await this.markChapterRead(runId, chapterNumber);
    }
  }

  async markChapterRangeRead(runId: number, fromChapter: number, toChapter: number): Promise<void> {
    const chapters = Array.from(
      { length: toChapter - fromChapter + 1 }, 
      (_, i) => fromChapter + i
    );
    
    await this.markChaptersRead(runId, chapters);
  }

  async getReadingHistory(runId: number): Promise<ChapterProgress[]> {
    const chapters = await this.getChaptersForRun(runId);
    return chapters.sort((a, b) => 
      b.readAt.getTime() - a.readAt.getTime()
    );
  }

  async clearProgress(runId: number): Promise<void> {
    await this.supabaseService.client
      .from('chapter_progress')
      .delete()
      .eq('run_id', runId);

    this.mediaService.triggerFilterUpdate();
  }
}
