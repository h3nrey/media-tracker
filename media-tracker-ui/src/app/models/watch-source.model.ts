export interface WatchSource {
  id?: number;
  supabaseId?: number;
  name: string;
  baseUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  isDeleted?: boolean;
}
