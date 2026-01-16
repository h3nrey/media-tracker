export interface GameMetadata {
  mediaItemId: number;
  developers: string[];
  publishers: string[];
  platforms: string[]; // 'PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch'
  igdbId?: number;
  playtimeHours?: number;
  progressTotal?: number;
}

