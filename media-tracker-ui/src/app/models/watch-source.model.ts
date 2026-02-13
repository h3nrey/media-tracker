export interface WatchSource {
  id?: number;
  supabaseId?: number;
  name: string;
  baseUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted?: boolean;
}
