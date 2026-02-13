export interface UserProfile {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
