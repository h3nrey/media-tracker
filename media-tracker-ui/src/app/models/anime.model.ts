import { AnimeMetadata } from "./anime-metadata.model";
import { MediaItem } from "./media-type.model";

export interface Anime extends MediaItem {
  mediaItemId: number;
  studios: string[];
  malId?: number;
  t?: number;
}

export interface AnimeWatchLink {
  sourceId: number;
  url: string;
}

export interface AnimeFilterParams {
  query?: string;
  sortBy?: 'title' | 'score' | 'updated' | 'releaseYear';
  sortOrder?: 'asc' | 'desc';
  genres?: string[];
  studios?: string[];
  year?: number;
  activityYear?: number;
}
