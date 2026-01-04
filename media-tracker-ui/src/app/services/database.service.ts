import Dexie, { Table } from 'dexie';
import { Anime } from '../models/anime.model';
import { Category, DEFAULT_CATEGORIES } from '../models/status.model';
import { WatchSource } from '../models/watch-source.model';
import { List, Folder } from '../models/list.model';

export class AnimeTrackerDatabase extends Dexie {
  anime!: Table<Anime, number>;
  categories!: Table<Category, number>;
  watchSources!: Table<WatchSource, number>;
  lists!: Table<List, number>;
  folders!: Table<Folder, number>;

  constructor() {
    super('AnimeTrackerDB');
    
    this.version(1).stores({
      anime: '++id, title, malId, statusId, score, releaseYear, createdAt, updatedAt',
      categories: '++id, name, order, createdAt, updatedAt'
    });

    this.version(3).stores({
      anime: '++id, supabaseId, title, malId, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, isDeleted'
    });

    this.version(4).stores({
      anime: '++id, supabaseId, title, malId, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, createdAt, updatedAt, isDeleted',
      folders: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted'
    });
  }

  async seedDefaultCategories(): Promise<void> {
    const count = await this.categories.count();
    
    if (count === 0) {
      const now = new Date();
      const categoriesToAdd = DEFAULT_CATEGORIES.map(category => ({
        ...category,
        createdAt: now,
        updatedAt: now
      }));
      
      await this.categories.bulkAdd(categoriesToAdd);
      console.log('Default categories seeded successfully');
    }
  }
}

export const db = new AnimeTrackerDatabase();
