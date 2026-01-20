export interface MediaLog {
  id?: number;
  supabaseId?: number;
  mediaItemId: number;
  startDate?: Date | string;
  endDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastSyncedAt?: Date;
  isDeleted?: boolean;
}
