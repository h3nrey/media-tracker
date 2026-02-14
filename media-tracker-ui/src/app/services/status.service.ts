import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Category, DEFAULT_CATEGORIES } from '../models/status.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  private mapFromSupabase(item: any): Category {
    return {
      id: item.id,
      supabaseId: item.id,
      name: item.name,
      color: item.color,
      icon: item.icon,
      order: item.order,
      isDeleted: item.is_deleted,
      version: item.version,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  }

  getAllCategories$(): Observable<Category[]> {
    return from(this.getAllCategories());
  }

  async getAllCategories(): Promise<Category[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    const { data, error } = await this.supabaseService.client
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map(item => this.mapFromSupabase(item));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return this.mapFromSupabase(data);
  }

  async addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const supabaseData = {
      user_id: user.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      order: category.order,
      is_deleted: false,
      version: 1
    };

    const { data, error } = await this.supabaseService.client
      .from('categories')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<void> {
    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) supabaseData.name = updates.name;
    if (updates.color !== undefined) supabaseData.color = updates.color;
    if (updates.icon !== undefined) supabaseData.icon = updates.icon;
    if (updates.order !== undefined) supabaseData.order = updates.order;
    if (updates.version !== undefined) supabaseData.version = updates.version;

    const { error } = await this.supabaseService.client
      .from('categories')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCategory(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('categories')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async reorderCategories(categoryIds: number[]): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
      id,
      order: index,
      updated_at: new Date().toISOString()
    }));

    // In a real app we might want to use a transaction or a bulk update if possible
    // Supabase doesn't support bulk updates with different values per row in a single query easily via SDK
    // but we can send an array of objects to upsert if we have IDs.
    const { error } = await this.supabaseService.client
      .from('categories')
      .upsert(updates);

    if (error) throw error;
  }

  async seedDefaultCategories(): Promise<void> {
    const data = await this.getAllCategories();
    if (data.length === 0) {
      const user = this.authService.currentUser();
      if (!user) return;

      const categoriesToAdd = DEFAULT_CATEGORIES.map(category => ({
        user_id: user.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        order: category.order,
        is_deleted: false,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      await this.supabaseService.client.from('categories').insert(categoriesToAdd);
    }
  }
}
