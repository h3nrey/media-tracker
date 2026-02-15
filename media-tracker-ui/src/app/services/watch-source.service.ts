import { Injectable, inject } from '@angular/core';
import { from, Observable, map, switchMap } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { WatchSource } from '../models/watch-source.model';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class WatchSourceService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  private mediaService = inject(MediaService);
  
  private mapFromSupabase(item: any): WatchSource {
    return {
      id: item.id,
      supabaseId: item.id,
      name: item.name,
      iconUrl: item.icon_url,
      baseUrl: item.base_url,
      isDeleted: item.is_deleted,
      version: item.version,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  getAllSources$(): Observable<WatchSource[]> {
    return this.mediaService.filterUpdate$.pipe(
      switchMap(() => from(this.getAllSources()))
    );
  }

  async getAllSources(): Promise<WatchSource[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('watch_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async addSource(source: Omit<WatchSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const supabaseData = {
      user_id: user.id,
      name: source.name,
      icon_url: source.iconUrl,
      base_url: source.baseUrl,
      is_deleted: false,
      version: 1
    };

    const { data, error } = await this.supabaseService.client
      .from('watch_sources')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
    return data.id;
  }

  async updateSource(id: number, changes: Partial<WatchSource>): Promise<void> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (changes.name !== undefined) supabaseData.name = changes.name;
    if (changes.iconUrl !== undefined) supabaseData.icon_url = changes.iconUrl;
    if (changes.baseUrl !== undefined) supabaseData.base_url = changes.baseUrl;
    if (changes.version !== undefined) supabaseData.version = changes.version;

    const { error } = await this.supabaseService.client
      .from('watch_sources')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
  }

  async deleteSource(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('watch_sources')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    this.mediaService.triggerFilterUpdate();
  }
}
