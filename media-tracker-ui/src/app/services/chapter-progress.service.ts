import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { liveQuery } from 'dexie';
import { db } from './database.service';
import { ChapterProgress } from '../models/media-run.model';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class ChapterProgressService {
  private syncService = inject(SyncService);

  /**
   * Get all read chapters for a specific run
   */
  getChaptersForRun$(runId: number): Observable<ChapterProgress[]> {
    return from(liveQuery(async () => {
      const chapters = await db.chapterProgress
        .where('runId')
        .equals(runId)
        .toArray();
      
      return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }));
  }

  /**
   * Get all read chapters for a specific run (promise version)
   */
  async getChaptersForRun(runId: number): Promise<ChapterProgress[]> {
    const chapters = await db.chapterProgress
      .where('runId')
      .equals(runId)
      .toArray();
    
    return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  /**
   * Check if a specific chapter has been read
   */
  async isChapterRead(runId: number, chapterNumber: number): Promise<boolean> {
    const chapter = await db.chapterProgress
      .where(['runId', 'chapterNumber'])
      .equals([runId, chapterNumber])
      .first();
    
    return !!chapter;
  }

  /**
   * Mark a chapter as read
   */
  async markChapterRead(runId: number, chapterNumber: number): Promise<number> {
    const now = new Date();

    // Check if already marked
    const existing = await db.chapterProgress
      .where(['runId', 'chapterNumber'])
      .equals([runId, chapterNumber])
      .first();
    
    if (existing) {
      return existing.id!;
    }

    const id = await db.chapterProgress.add({
      runId,
      chapterNumber,
      readAt: now,
      createdAt: now
    } as ChapterProgress);

    this.syncService.sync();
    return id as number;
  }

  /**
   * Mark a chapter as unread (delete the progress entry)
   */
  async markChapterUnread(runId: number, chapterNumber: number): Promise<void> {
    const chapter = await db.chapterProgress
      .where(['runId', 'chapterNumber'])
      .equals([runId, chapterNumber])
      .first();
    
    if (chapter?.id) {
      await db.chapterProgress.delete(chapter.id);
      this.syncService.sync();
    }
  }

  /**
   * Mark the next unread chapter as read
   */
  async markNextChapterRead(runId: number): Promise<number | null> {
    const readChapters = await this.getChaptersForRun(runId);
    const readNumbers = readChapters.map(c => c.chapterNumber);
    
    // Find the next chapter number
    let nextChapter = 1;
    while (readNumbers.includes(nextChapter)) {
      nextChapter++;
    }
    
    return this.markChapterRead(runId, nextChapter);
  }

  /**
   * Get progress statistics for a run
   */
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
    
    // Find next chapter to read
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

  /**
   * Mark multiple chapters as read (for binge reading)
   */
  async markChaptersRead(runId: number, chapterNumbers: number[]): Promise<void> {
    const now = new Date();
    
    for (const chapterNumber of chapterNumbers) {
      const existing = await db.chapterProgress
        .where(['runId', 'chapterNumber'])
        .equals([runId, chapterNumber])
        .first();
      
      if (!existing) {
        await db.chapterProgress.add({
          runId,
          chapterNumber,
          readAt: now,
          createdAt: now
        } as ChapterProgress);
      }
    }

    this.syncService.sync();
  }

  /**
   * Mark a range of chapters as read
   */
  async markChapterRangeRead(runId: number, fromChapter: number, toChapter: number): Promise<void> {
    const chapters = Array.from(
      { length: toChapter - fromChapter + 1 }, 
      (_, i) => fromChapter + i
    );
    
    await this.markChaptersRead(runId, chapters);
  }

  /**
   * Get reading history (all chapters with dates)
   */
  async getReadingHistory(runId: number): Promise<ChapterProgress[]> {
    const chapters = await this.getChaptersForRun(runId);
    return chapters.sort((a, b) => 
      new Date(b.readAt).getTime() - new Date(a.readAt).getTime()
    );
  }

  /**
   * Delete all progress for a run
   */
  async clearProgress(runId: number): Promise<void> {
    const chapters = await this.getChaptersForRun(runId);
    const ids = chapters.map(c => c.id!).filter(id => !!id);
    
    await db.chapterProgress.bulkDelete(ids);
    this.syncService.sync();
  }
}
