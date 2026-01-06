import { Anime } from "./anime.model";
import { MediaItem } from "./media-type.model";

export interface List {
  id?: number;
  supabaseId?: number;
  name: string;
  description?: string;
  animeIds: number[];
  mediaItemIds?: number[];
  folderId?: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  lastSyncedAt?: Date;
}

export interface ListDetails extends List {
  animes: Anime[];
  mediaItems?: MediaItem[];
}

export interface Folder {
  id?: number;
  supabaseId?: number;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  lastSyncedAt?: Date;
}
