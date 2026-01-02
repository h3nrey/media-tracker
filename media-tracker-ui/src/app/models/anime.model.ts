export interface Anime {
  id?: number;
  supabaseId?: number;
  title: string;
  coverImage?: string;
  bannerImage?: string;
  malId?: number;
  episodesWatched: number;
  totalEpisodes: number;
  statusId: number;
  score: number;
  genres: string[];
  studios: string[];
  releaseYear?: number;
  trailerUrl?: string;
  notes?: string;
  watchDates?: Date[];
  watchLinks?: AnimeWatchLink[];
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  isDeleted?: boolean;
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
}
