/**
 * Represents a complete playthrough/watchthrough of a media item
 * A user can have multiple runs of the same media (rewatches, replays)
 */
export interface MediaRun {
  id?: number;
  supabaseId?: number;
  userId: string;
  mediaItemId: number;
  runNumber: number; // 1 for first watch, 2 for rewatch, etc.
  startDate?: Date;
  endDate?: Date;
  rating?: number; // 0-10
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

/**
 * Individual play session for a game within a run
 */
export interface GameSession {
  id?: number;
  supabaseId?: number;
  runId: number;
  playedAt: Date;
  durationMinutes: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

/**
 * Tracks which episode was watched in a series run
 */
export interface EpisodeProgress {
  id?: number;
  supabaseId?: number;
  runId: number;
  episodeNumber: number;
  watchedAt: Date;
  createdAt: Date;
  lastSyncedAt?: Date;
}

/**
 * Tracks which chapter was read in a manga run
 */
export interface ChapterProgress {
  id?: number;
  supabaseId?: number;
  runId: number;
  chapterNumber: number;
  readAt: Date;
  createdAt: Date;
  lastSyncedAt?: Date;
}

/**
 * Helper type for run statistics
 */
export interface RunStatistics {
  runId: number;
  mediaItemId: number;
  
  // For games
  totalHoursPlayed?: number;
  sessionCount?: number;
  
  // For series
  episodesWatched?: number;
  episodesTotal?: number;
  
  // For manga
  chaptersRead?: number;
  chaptersTotal?: number;
  
  // Progress percentage
  progressPercentage: number;
}
