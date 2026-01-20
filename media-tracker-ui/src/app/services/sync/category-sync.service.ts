import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { db } from '../database.service';
import { Category } from '../../models/status.model';

@Injectable({
  providedIn: 'root'
})
export class CategorySyncService {
  private supabase = inject(SupabaseService).client;

  async sync() {
    const localCategories = await db.categories.toArray();
    const { data: remoteCategories, error } = await this.supabase
      .from('categories')
      .select('*');
    
    if (error) throw error;

    for (const local of localCategories) {
      let remote = remoteCategories?.find(r => r.id === local.supabaseId);
      
      if (!remote && !local.supabaseId) {
        // Match by name for default/pre-existing categories
        remote = remoteCategories?.find(r => r.name === local.name && !r.is_deleted);
        if (remote) {
          await db.categories.update(local.id!, { supabaseId: remote.id });
          local.supabaseId = remote.id;
        }
      }
      
      if (!remote) {
        if (!local.isDeleted) {
          const { data, error: insertError } = await this.supabase
            .from('categories')
            .insert([{
              name: local.name,
              color: local.color,
              order: local.order,
              is_deleted: false,
              created_at: local.createdAt.toISOString(),
              updated_at: local.updatedAt.toISOString()
            }])
            .select()
            .single();

          if (insertError) console.error('Error inserting category:', insertError);
          else {
            await db.categories.update(local.id!, { 
              supabaseId: data.id, 
              lastSyncedAt: new Date() 
            });
          }
        }
      } else {
        const remoteUpdatedAt = new Date(remote.updated_at);
        if (local.updatedAt > remoteUpdatedAt && (!local.lastSyncedAt || local.updatedAt > local.lastSyncedAt)) {
          await this.supabase
            .from('categories')
            .update({
              name: local.name,
              color: local.color,
              order: local.order,
              is_deleted: !!local.isDeleted,
              updated_at: local.updatedAt.toISOString()
            })
            .eq('id', local.supabaseId);
          
          await db.categories.update(local.id!, { lastSyncedAt: new Date() });
        } else if (remoteUpdatedAt > (local.lastSyncedAt || local.updatedAt)) {
          await db.categories.update(local.id!, {
            name: remote.name,
            color: remote.color,
            order: remote.order,
            isDeleted: remote.is_deleted,
            updatedAt: remoteUpdatedAt,
            lastSyncedAt: new Date()
          });
        }
      }
    }

    for (const remote of remoteCategories || []) {
      const local = localCategories.find(l => l.supabaseId === remote.id);
      if (!local) {
        await db.categories.add({
          supabaseId: remote.id,
          name: remote.name,
          color: remote.color,
          order: remote.order,
          isDeleted: remote.is_deleted,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.updated_at),
          lastSyncedAt: new Date()
        } as Category);
      }
    }
  }
}
