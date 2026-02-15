export interface PortalShortcut {
  id?: number;
  userId?: string;
  name: string;
  url: string;
  iconUrl?: string;
  mediaTypeId: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}
