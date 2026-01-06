export interface MovieMetadata {
  mediaItemId: number;
  directors: string[];
  cast: string[];
  studios: string[];
  tmdbId?: number;
  runtimeMinutes?: number;
}
