export interface SyncConflict {
  id?: number;
  entityType: string;
  localPayload: any;
  remotePayload: any;
  resolved: boolean;
  createdAt: Date;
}
