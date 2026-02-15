import { Injectable, inject } from '@angular/core';
import { from, Observable, map, switchMap, BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { PortalShortcut } from '../models/portal-shortcut.model';

@Injectable({
  providedIn: 'root'
})
export class PortalShortcutService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  
  private updateSubject = new BehaviorSubject<void>(undefined);
  refresh$ = this.updateSubject.asObservable();

  private mapFromSupabase(item: any): PortalShortcut {
    return {
      id: item.id,
      userId: item.user_id,
      name: item.name,
      url: item.url,
      iconUrl: item.icon_url,
      mediaTypeId: item.media_type_id,
      order: item.order || 0,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  getShortcuts$(): Observable<PortalShortcut[]> {
    return this.refresh$.pipe(
      switchMap(() => from(this.getShortcuts()))
    );
  }

  async getShortcuts(): Promise<PortalShortcut[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('portal_shortcuts')
      .select('*')
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    if (error) return [];
    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async addShortcut(shortcut: Omit<PortalShortcut, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const supabaseData = {
      user_id: user.id,
      name: shortcut.name,
      url: shortcut.url,
      icon_url: shortcut.iconUrl,
      media_type_id: shortcut.mediaTypeId,
      order: shortcut.order || 0
    };

    const { data, error } = await this.supabaseService.client
      .from('portal_shortcuts')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    this.triggerRefresh();
    return data.id;
  }

  async updateShortcut(id: number, changes: Partial<PortalShortcut>): Promise<void> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (changes.name !== undefined) supabaseData.name = changes.name;
    if (changes.url !== undefined) supabaseData.url = changes.url;
    if (changes.iconUrl !== undefined) supabaseData.icon_url = changes.iconUrl;
    if (changes.mediaTypeId !== undefined) supabaseData.media_type_id = changes.mediaTypeId;
    if (changes.order !== undefined) supabaseData.order = changes.order;

    const { error } = await this.supabaseService.client
      .from('portal_shortcuts')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
    this.triggerRefresh();
  }

  async deleteShortcut(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('portal_shortcuts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.triggerRefresh();
  }

  triggerRefresh() {
    this.updateSubject.next();
  }
}
