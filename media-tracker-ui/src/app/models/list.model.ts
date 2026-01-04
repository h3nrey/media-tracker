import { Anime } from "./anime.model";

export interface List {
  id?: number;
  supabaseId?: number;
  name: string;
  description?: string;
  animeIds: number[];
  folderId?: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  lastSyncedAt?: Date;
}

export interface ListDetails extends List {
  animes: Anime[];
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
