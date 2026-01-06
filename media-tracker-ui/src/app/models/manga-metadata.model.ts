export interface MangaMetadata {
  mediaItemId: number;
  authors: string[];
  publishers: string[];
  malId?: number;
  publicationStatus?: string; // 'Publishing', 'Finished', 'Hiatus'
}
