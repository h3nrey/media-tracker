import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from, map } from 'rxjs';
import { Category, DEFAULT_CATEGORIES } from '../models/status.model';
import { db } from './database.service';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private syncService = inject(SyncService);

  getAllCategories$(): Observable<Category[]> {
    return from(liveQuery(() => 
      db.categories.toCollection().sortBy('order')
    )).pipe(
        map(cats => cats.filter(c => !c.isDeleted))
    );
  }

  async getAllCategories(): Promise<Category[]> {
    const cats = await db.categories.toCollection().sortBy('order');
    return cats.filter(c => !c.isDeleted);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return await db.categories.get(id);
  }

  async addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const id = await db.categories.add({
      ...category,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      version: 1
    } as Category);
    
    this.syncService.sync(); // Trigger sync in background
    return id;
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<void> {
    const existing = await db.categories.get(id);
    await db.categories.update(id, {
      ...updates,
      updatedAt: new Date(),
      version: (existing?.version || 1) + 1
    });
    this.syncService.sync();
  }

  async deleteCategory(id: number): Promise<void> {
    // Soft delete for sync
    const existing = await db.categories.get(id);
    await db.categories.update(id, {
      isDeleted: true,
      updatedAt: new Date(),
      version: (existing?.version || 1) + 1
    });
    this.syncService.sync();
  }

  async reorderCategories(categoryIds: number[]): Promise<void> {
    const now = new Date();
    const existing = await db.categories.toArray();
    const updates = categoryIds.map((id, index) => {
      const current = existing.find(c => c.id === id);
      return {
        key: id,
        changes: { 
          order: index, 
          updatedAt: now,
          version: (current?.version || 1) + 1
        }
      };
    });

    await db.categories.bulkUpdate(updates);
    this.syncService.sync();
  }

  async seedDefaultCategories(): Promise<void> {
    const count = await db.categories.count();
    
    if (count === 0) {
      const now = new Date();
      const categoriesToAdd = DEFAULT_CATEGORIES.map(category => ({
        ...category,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        version: 1
      }));
      
      await db.categories.bulkAdd(categoriesToAdd as Category[]);
      this.syncService.sync();
    }
  }
}
