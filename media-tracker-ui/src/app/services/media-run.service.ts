import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { liveQuery } from 'dexie';
import { db } from './database.service';
import { MediaRun } from '../models/media-run.model';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MediaRunService {
  private syncService = inject(SyncService);
  private authService = inject(AuthService);

  /**
   * Get all runs for a specific media item
   */
  getRunsForMedia$(mediaItemId: number): Observable<MediaRun[]> {
    return from(liveQuery(async () => {
      const runs = await db.mediaRuns
        .where('mediaItemId')
        .equals(mediaItemId)
        .toArray();
      
      return runs
        .filter(r => !r.isDeleted)
        .sort((a, b) => a.runNumber - b.runNumber);
    }));
  }

  /**
   * Get all runs for a specific media item (promise version)
   */
  async getRunsForMedia(mediaItemId: number): Promise<MediaRun[]> {
    const runs = await db.mediaRuns
      .where('mediaItemId')
      .equals(mediaItemId)
      .toArray();
    
    return runs
      .filter(r => !r.isDeleted)
      .sort((a, b) => a.runNumber - b.runNumber);
  }

  /**
   * Get a specific run by ID
   */
  async getRunById(id: number): Promise<MediaRun | undefined> {
    return await db.mediaRuns.get(id);
  }

  /**
   * Get the current active run for a media item (no end date)
   */
  async getActiveRun(mediaItemId: number): Promise<MediaRun | undefined> {
    const runs = await this.getRunsForMedia(mediaItemId);
    return runs.find(r => !r.endDate);
  }

  /**
   * Create a new run
   */
  async createRun(run: Omit<MediaRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date();
    
    if (!run.endDate) {
      const activeRun = await this.getActiveRun(run.mediaItemId);
      if (activeRun) {
        await this.updateRun(activeRun.id!, { endDate: now });
      }
    }

    // Determine the target run number
    let targetRunNumber = run.runNumber;
    if (!targetRunNumber) {
      const activeRuns = await this.getRunsForMedia(run.mediaItemId);
      targetRunNumber = activeRuns.length > 0 
        ? Math.max(...activeRuns.map(r => r.runNumber)) + 1 
        : 1;
    }

    // Check if a run with this number already exists (including deleted ones)
    const existingRun = await db.mediaRuns
      .where({ mediaItemId: run.mediaItemId, runNumber: targetRunNumber })
      .first();

    if (existingRun) {
      // If we're restoring a run that was "Ongoing", we don't need to finish it 
      // because we already finished "the previous" one above.
      await db.mediaRuns.update(existingRun.id!, {
        ...run,
        isDeleted: false,
        updatedAt: now
      });
      this.syncService.sync();
      return existingRun.id!;
    }

    const id = await db.mediaRuns.add({
      ...run,
      userId: user.id,
      runNumber: targetRunNumber,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    } as MediaRun);

    this.syncService.sync();
    return id as number;
  }

  /**
   * Update an existing run
   */
  async updateRun(id: number, updates: Partial<MediaRun>): Promise<number> {
    const now = new Date();
    
    const result = await db.mediaRuns.update(id, {
      ...updates,
      updatedAt: now
    });

    this.syncService.sync();
    return result;
  }

  /**
   * Complete a run (set end date and optionally rating)
   */
  async completeRun(id: number, rating?: number): Promise<number> {
    return this.updateRun(id, {
      endDate: new Date(),
      rating
    });
  }

  /**
   * Delete a run (soft delete)
   */
  async deleteRun(id: number): Promise<void> {
    await db.mediaRuns.update(id, {
      isDeleted: true,
      updatedAt: new Date()
    });
    
    this.syncService.sync();
  }

  /**
   * Start a new run for a media item
   */
  async startNewRun(mediaItemId: number): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    // Check if there's already an active run
    const activeRun = await this.getActiveRun(mediaItemId);
    if (activeRun) {
      throw new Error('There is already an active run for this media item');
    }

    return this.createRun({
      userId: user.id,
      mediaItemId,
      runNumber: 0, // Will be calculated in createRun
      startDate: new Date(),
      isDeleted: false
    });
  }

  /**
   * Get all runs for the current user
   */
  async getAllUserRuns(): Promise<MediaRun[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const runs = await db.mediaRuns
      .where('userId')
      .equals(user.id)
      .toArray();
    
    return runs.filter(r => !r.isDeleted);
  }

  /**
   * Get completed runs for a specific year
   */
  async getCompletedRunsByYear(year: number): Promise<MediaRun[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const runs = await db.mediaRuns
      .where('userId')
      .equals(user.id)
      .toArray();
    
    return runs.filter(r => {
      if (r.isDeleted || !r.endDate) return false;
      const endYear = new Date(r.endDate).getFullYear();
      return endYear === year;
    });
  }
}
