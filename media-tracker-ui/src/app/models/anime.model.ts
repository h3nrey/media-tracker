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
  releaseYear?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
