import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map } from 'rxjs';
import { MediaRun } from '../models/media-run.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class MediaRunService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  private mediaService = inject(MediaService);

  private mapFromSupabase(item: any): MediaRun {
    return {
      id: item.id,
      supabaseId: item.id,
      userId: item.user_id,
      mediaItemId: item.media_item_id,
      runNumber: item.run_number,
      startDate: item.start_date ? new Date(item.start_date) : undefined,
      endDate: item.end_date ? new Date(item.end_date) : undefined,
      rating: item.rating,
      notes: item.notes,
      isDeleted: item.is_deleted,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  getRunsForMedia$(mediaItemId: number): Observable<MediaRun[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getRunsForMedia(mediaItemId)))
    );
  }

  async getRunsForMedia(mediaItemId: number): Promise<MediaRun[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('media_runs')
      .select('*')
      .eq('media_item_id', mediaItemId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('run_number', { ascending: true });

    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async getRunById(id: number): Promise<MediaRun | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('media_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return this.mapFromSupabase(data);
  }

  async getActiveRun(mediaItemId: number): Promise<MediaRun | undefined> {
    const runs = await this.getRunsForMedia(mediaItemId);
    return runs.find(r => !r.endDate);
  }

  async createRun(run: Omit<MediaRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    if (!run.endDate) {
      const activeRun = await this.getActiveRun(run.mediaItemId);
      if (activeRun) {
        await this.updateRun(activeRun.id!, { endDate: new Date() });
      }
    }

    let targetRunNumber = run.runNumber;
    if (!targetRunNumber) {
      const activeRuns = await this.getRunsForMedia(run.mediaItemId);
      targetRunNumber = activeRuns.length > 0 
        ? Math.max(...activeRuns.map(r => r.runNumber)) + 1 
        : 1;
    }

    const supabaseData = {
      user_id: user.id,
      media_item_id: run.mediaItemId,
      run_number: targetRunNumber,
      start_date: run.startDate?.toISOString(),
      end_date: run.endDate?.toISOString(),
      rating: run.rating,
      notes: run.notes,
      is_deleted: false
    };

    const { data, error } = await this.supabaseService.client
      .from('media_runs')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  async updateRun(id: number, updates: Partial<MediaRun>): Promise<number> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.startDate !== undefined) supabaseData.start_date = updates.startDate?.toISOString();
    if (updates.endDate !== undefined) supabaseData.end_date = updates.endDate?.toISOString();
    if (updates.rating !== undefined) supabaseData.rating = updates.rating;
    if (updates.notes !== undefined) supabaseData.notes = updates.notes;
    if (updates.runNumber !== undefined) supabaseData.run_number = updates.runNumber;

    const { error } = await this.supabaseService.client
      .from('media_runs')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return id;
  }

  async completeRun(id: number, rating?: number): Promise<number> {
    return this.updateRun(id, {
      endDate: new Date(),
      rating
    });
  }

  async deleteRun(id: number): Promise<void> {
    await this.supabaseService.client
      .from('media_runs')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    this.mediaService.triggerFilterUpdate();
  }

  async startNewRun(mediaItemId: number): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const activeRun = await this.getActiveRun(mediaItemId);
    if (activeRun) {
      throw new Error('There is already an active run for this media item');
    }

    return this.createRun({
      userId: user.id,
      mediaItemId,
      runNumber: 0,
      startDate: new Date(),
      isDeleted: false,
      rating: 0
    });
  }

  async getAllUserRuns(): Promise<MediaRun[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('media_runs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);
    
    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async getCompletedRunsByYear(year: number): Promise<MediaRun[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('media_runs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .not('end_date', 'is', null);
    
    if (error) return [];
    
    const runs = (data || []).map(item => this.mapFromSupabase(item));
    return runs.filter(r => r.endDate && r.endDate.getFullYear() === year);
  }
}
