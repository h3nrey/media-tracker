import { Anime } from "./anime.model";
import { MediaItem } from "./media-type.model";

export interface List {
  id?: number;
  supabaseId?: number;
  name: string;
  description?: string;
  animeIds: number[];
  mediaItemIds?: number[];
  mediaTypeId?: number | null;
  folderId?: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface ListDetails extends List {
  animes: Anime[];
  mediaItems?: MediaItem[];
}

export interface Folder {
  id?: number;
  supabaseId?: number;
  name: string;
  icon?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}
