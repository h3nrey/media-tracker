export interface Anime {
  id?: number;
  title: string;
  coverImage?: string;
  malId?: number;
  episodesWatched: number;
  totalEpisodes: number;
  statusId: number;
  score: number;
  genres: string[];
  studios: string[];
  releaseYear?: number;
  notes?: string;
  watchDates?: Date[];
  createdAt: Date;
  updatedAt: Date;
}
