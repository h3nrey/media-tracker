import Dexie, { Table } from 'dexie';
import { Anime } from '../models/anime.model';
import { Category, DEFAULT_CATEGORIES } from '../models/status.model';
import { WatchSource } from '../models/watch-source.model';
import { List, Folder } from '../models/list.model';
import { MediaItem, MediaTypeDefinition, MediaGalleryImage } from '../models/media-type.model';
import { AnimeMetadata } from '../models/anime-metadata.model';
import { MangaMetadata } from '../models/manga-metadata.model';
import { GameMetadata } from '../models/game-metadata.model';
import { MovieMetadata } from '../models/movie-metadata.model';
import { MediaLog } from '../models/media-log.model';

export class AnimeTrackerDatabase extends Dexie {
  anime!: Table<Anime, number>;
  categories!: Table<Category, number>;
  watchSources!: Table<WatchSource, number>;
  lists!: Table<List, number>;
  folders!: Table<Folder, number>;
  
  // New media types tables
  mediaTypes!: Table<MediaTypeDefinition, number>;
  mediaItems!: Table<MediaItem, number>;
  animeMetadata!: Table<AnimeMetadata, number>;
  mangaMetadata!: Table<MangaMetadata, number>;
  gameMetadata!: Table<GameMetadata, number>;
  movieMetadata!: Table<MovieMetadata, number>;
  mediaLogs!: Table<MediaLog, number>;
  mediaImages!: Table<MediaGalleryImage, number>;

  constructor() {
    super('AnimeTrackerDB');
    
    this.version(1).stores({
      anime: '++id, title, malId, statusId, score, releaseYear, createdAt, updatedAt',
      categories: '++id, name, order, createdAt, updatedAt'
    });

    this.version(3).stores({
      anime: '++id, supabaseId, title, malId, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, isDeleted'
    });

    this.version(4).stores({
      anime: '++id, supabaseId, title, malId, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, createdAt, updatedAt, isDeleted',
      folders: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted'
    });

    this.version(5).stores({
      mediaTypes: '++id, name, createdAt',
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, externalApi, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      animeMetadata: 'mediaItemId, malId',
      mangaMetadata: 'mediaItemId, malId',
      gameMetadata: 'mediaItemId, igdbId',
      movieMetadata: 'mediaItemId, tmdbId',
      // Keep legacy stores for migration
      anime: '++id, supabaseId, title, malId, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, createdAt, updatedAt, isDeleted'
    }).upgrade(async trans => {
      // Migration logic for version 5
      const anime = await trans.table('anime').toArray();
      const now = new Date();
      
      // 1. Seed media types
      const mediaTypes: MediaTypeDefinition[] = [
        { id: 1, name: 'Anime', icon: 'play-circle', createdAt: now },
        { id: 2, name: 'Manga', icon: 'book-open', createdAt: now },
        { id: 3, name: 'Game', icon: 'gamepad-2', createdAt: now },
        { id: 4, name: 'Movie', icon: 'clapperboard', createdAt: now }
      ];
      await trans.table('mediaTypes').bulkAdd(mediaTypes);

      // 2. Migrate anime to mediaItems and animeMetadata
      for (const item of anime) {
        const mediaItemId = await trans.table('mediaItems').add({
          supabaseId: item.supabaseId,
          mediaTypeId: 1, // Anime
          title: item.title,
          coverImage: item.coverImage,
          bannerImage: item.bannerImage,
          externalId: item.malId,
          externalApi: 'mal',
          progress_current: item.episodesWatched,
          progress_total: item.totalEpisodes,
          statusId: item.statusId,
          score: item.score,
          genres: item.genres,
          releaseYear: item.releaseYear,
          trailerUrl: item.trailerUrl,
          notes: item.notes,
          activityDates: item.watchDates,
          sourceLinks: item.watchLinks?.map((link: { sourceId: number; url: string }) => ({
            sourceId: link.sourceId,
            url: link.url
          })),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          lastSyncedAt: item.lastSyncedAt,
          isDeleted: item.isDeleted
        });

        await trans.table('animeMetadata').add({
          mediaItemId: mediaItemId as number,
          studios: item.studios,
          malId: item.malId
        });

        // 3. Update lists to map anime IDs to mediaItem IDs
        const lists = await trans.table('lists').toArray();
        for (const list of lists) {
          if (list.animeIds && list.animeIds.includes(item.id)) {
            const mediaItemIds = list.mediaItemIds || [];
            if (!mediaItemIds.includes(mediaItemId as number)) {
              mediaItemIds.push(mediaItemId as number);
            }
            await trans.table('lists').update(list.id, { mediaItemIds: mediaItemIds });
          }
        }
      }
    });

    this.version(6).stores({
      mediaTypes: '++id, name, createdAt',
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, externalApi, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      animeMetadata: 'mediaItemId, malId',
      mangaMetadata: 'mediaItemId, malId',
      gameMetadata: 'mediaItemId, igdbId',
      movieMetadata: 'mediaItemId, tmdbId',
      mediaLogs: '++id, supabaseId, mediaItemId, startDate, endDate, createdAt, updatedAt, isDeleted',
      // Keep legacy stores for migration
      anime: '++id, supabaseId, title, malId, statusId, score, releaseYear, createdAt, updatedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, createdAt, updatedAt, isDeleted'
    });

    this.version(9).stores({
      mediaTypes: '++id, name, createdAt',
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, externalApi, statusId, score, releaseYear, createdAt, updatedAt, lastSyncedAt, isDeleted',
      animeMetadata: 'mediaItemId, malId',
      mangaMetadata: 'mediaItemId, malId',
      gameMetadata: 'mediaItemId, igdbId',
      movieMetadata: 'mediaItemId, tmdbId',
      mediaLogs: '++id, supabaseId, mediaItemId, startDate, endDate, createdAt, updatedAt, lastSyncedAt, isDeleted',
      mediaImages: '++id, supabaseId, mediaItemId, url, createdAt, updatedAt, lastSyncedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, mediaTypeId, createdAt, updatedAt, lastSyncedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, lastSyncedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, lastSyncedAt, isDeleted',
      folders: '++id, supabaseId, name, order, createdAt, updatedAt, lastSyncedAt, isDeleted'
    });
  }

  async seedDefaultCategories(): Promise<void> {
    const count = await this.categories.count();
    
    if (count === 0) {
      const now = new Date();
      const categoriesToAdd = DEFAULT_CATEGORIES.map(category => ({
        ...category,
        createdAt: now,
        updatedAt: now
      }));
      
      await this.categories.bulkAdd(categoriesToAdd);
      console.log('Default categories seeded successfully');
    }
  }
}

export const db = new AnimeTrackerDatabase();
