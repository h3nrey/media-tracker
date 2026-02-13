export interface Category {
  id?: number;
  supabaseId?: number;
  name: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted?: boolean;
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'version'>[] = [
  { name: 'Plan to Watch', color: '#8B5CF6', order: 0 },
  { name: 'Watching', color: '#3B82F6', order: 1 },
  { name: 'Completed', color: '#10B981', order: 2 },
  { name: 'On Hold', color: '#F59E0B', order: 3 },
  { name: 'Dropped', color: '#EF4444', order: 4 },
];
