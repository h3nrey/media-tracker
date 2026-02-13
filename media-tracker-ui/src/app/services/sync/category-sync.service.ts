import { Injectable, inject } from '@angular/core';
import { db } from '../database.service';
import { Category } from '../../models/status.model';
import { SyncBaseService } from './sync-base.service';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class CategorySyncService extends SyncBaseService<Category> {
  protected override tableName = 'categories';
  protected override entityType = 'Category';

  async sync(lastSyncedAt?: Date) {
    const localCategories = await db.categories.toArray();
    await this.syncEntity(localCategories, lastSyncedAt);
  }

  protected override async handleMissingLocal(remote: any) {
    // Check for natural key match (name) before inserting
    const existingByName = await db.categories.where('name').equals(remote.name).first();
    
    if (existingByName) {
      if (!existingByName.supabaseId) {
        await db.categories.update(existingByName.id!, { 
          supabaseId: remote.id,
          version: remote.version 
        });
      } else {
        console.warn('Category name collision with different supabaseId', remote.name);
      }
    } else {
      await db.categories.add({
        supabaseId: remote.id,
        name: remote.name,
        color: remote.color,
        order: remote.order,
        isDeleted: remote.is_deleted,
        version: remote.version,
        createdAt: new Date(remote.created_at),
        updatedAt: new Date(remote.updated_at)
      } as Category);
    }
  }

  protected override async pullRemote(localId: number, remote: any) {
    await db.categories.update(localId, {
      name: remote.name,
      color: remote.color,
      order: remote.order,
      isDeleted: remote.is_deleted,
      version: remote.version,
      updatedAt: new Date(remote.updated_at)
    });
  }

  protected override mapToSupabase(local: Category) {
    const user = this.authService.currentUser()!;
    return {
      user_id: user.id,
      name: local.name,
      color: local.color,
      order: local.order,
      is_deleted: !!local.isDeleted,
      updated_at: local.updatedAt?.toISOString()
    };
  }

  protected override async handleNewLocal(local: Category) {
    const user = this.authService.currentUser()!;
    const supabaseData = this.mapToSupabase(local);
    
    const { data: matchedRemote } = await this.supabase
      .from('categories')
      .select('*')
      .eq('name', local.name)
      .eq('user_id', user.id)
      .maybeSingle();

    if (matchedRemote) {
      await db.categories.update(local.id!, { supabaseId: matchedRemote.id });
      await this.pullRemote(local.id!, matchedRemote);
    } else {
      const { data, error } = await this.supabase
        .from('categories')
        .insert([{
          ...supabaseData,
          version: 1,
          created_at: local.createdAt.toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error inserting category:', error);
      } else {
        await db.categories.update(local.id!, { 
          supabaseId: data.id,
          version: data.version
        });
      }
    }
  }
}
