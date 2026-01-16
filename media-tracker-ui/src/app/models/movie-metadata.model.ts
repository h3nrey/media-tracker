export interface MovieMetadata {
  mediaItemId: number;
  directors: string[];
  cast: string[];
  studios: string[];
  tmdbId?: number;
  progressCurrent?: number; // minutesWatched
  progressTotal?: number; // runtimeMinutes
}
