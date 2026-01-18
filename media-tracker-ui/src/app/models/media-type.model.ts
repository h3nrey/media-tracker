import { MediaLog } from "./media-log.model";

export enum MediaType {
  ANIME = 1,
  MANGA = 2,
  GAME = 3,
  MOVIE = 4
}

export interface MediaTypeDefinition {
  id: number;
  name: string;
  icon: string;
  createdAt: Date;
}

export interface MediaItem {
  id?: number;
  supabaseId?: number;
  mediaTypeId: number;
  title: string;
  coverImage?: string;
  bannerImage?: string;
  externalId?: number;
  externalApi?: string; // 'mal', 'igdb', 'tmdb'
  statusId: number;
  score: number;
  genres: string[];
  studios?: string[];
  platforms?: string[];
  releaseYear?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  trailerUrl?: string;
  notes?: string;
  activityDates?: Date[];
  sourceLinks?: MediaSourceLink[];
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  progressCurrent?: number;
  progressTotal?: number;
  logs?: MediaLog[];
  screenshots?: MediaGalleryImage[];
  reviews?: import('./review.model').MediaReview[];
  isDeleted?: boolean;
}

export interface MediaSourceLink {
  sourceId: number;
  url: string;
}

export interface MediaFilterParams {
  query?: string;
  sortBy?: 'title' | 'score' | 'updated' | 'releaseYear';
  sortOrder?: 'asc' | 'desc';
  genres?: string[];
  studios?: string[];
  year?: number;
  activityYear?: number;
}
export interface MediaGalleryImage {
  id?: number;
  supabaseId?: number;
  mediaItemId: number;
  url: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}
