import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { Category } from '../models/status.model';
import { db } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor() {}

  getAllCategories$(): Observable<Category[]> {
    return from(liveQuery(() => 
      db.categories.orderBy('order').toArray()
    ));
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.categories.orderBy('order').toArray();
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return await db.categories.get(id);
  }

  async addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const categoryToAdd: Omit<Category, 'id'> = {
      ...category,
      createdAt: now,
      updatedAt: now
    };
    
    return await db.categories.add(categoryToAdd as Category);
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<number> {
    return await db.categories.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteCategory(id: number): Promise<void> {
    await db.categories.delete(id);
  }

  async reorderCategories(categoryIds: number[]): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
      key: id,
      changes: { order: index, updatedAt: new Date() }
    }));

    await db.categories.bulkUpdate(updates);
  }
}
