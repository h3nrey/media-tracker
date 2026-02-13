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
import { MediaRun, GameSession, EpisodeProgress, ChapterProgress } from '../models/media-run.model';
import { UserProfile } from '../models/user-profile.model';
import { SyncConflict } from '../models/sync-conflict.model';

export class AnimeTrackerDatabase extends Dexie {
  anime!: Table<Anime, number>;
  categories!: Table<Category, number>;
  watchSources!: Table<WatchSource, number>;
  lists!: Table<List, number>;
  folders!: Table<Folder, number>;
  syncConflicts!: Table<SyncConflict, number>;
  
  mediaTypes!: Table<MediaTypeDefinition, number>;
  mediaItems!: Table<MediaItem, number>;
  animeMetadata!: Table<AnimeMetadata, number>;
  mangaMetadata!: Table<MangaMetadata, number>;
  gameMetadata!: Table<GameMetadata, number>;
  movieMetadata!: Table<MovieMetadata, number>;
  mediaImages!: Table<MediaGalleryImage, number>;

  mediaRuns!: Table<MediaRun, number>;
  gameSessions!: Table<GameSession, number>;
  episodeProgress!: Table<EpisodeProgress, number>;
  chapterProgress!: Table<ChapterProgress, number>;
  profiles!: Table<UserProfile, string>;

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

    // Version 10: Replace media_logs with media_runs system
    this.version(10).stores({
      mediaTypes: '++id, name, createdAt',
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, externalApi, statusId, score, releaseYear, createdAt, updatedAt, lastSyncedAt, isDeleted',
      animeMetadata: 'mediaItemId, malId',
      mangaMetadata: 'mediaItemId, malId',
      gameMetadata: 'mediaItemId, igdbId',
      movieMetadata: 'mediaItemId, tmdbId',
      mediaImages: '++id, supabaseId, mediaItemId, url, createdAt, updatedAt, lastSyncedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, mediaTypeId, createdAt, updatedAt, lastSyncedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, lastSyncedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, lastSyncedAt, isDeleted',
      folders: '++id, supabaseId, name, order, createdAt, updatedAt, lastSyncedAt, isDeleted',
      // New media runs tables
      mediaRuns: '++id, supabaseId, userId, mediaItemId, runNumber, startDate, endDate, createdAt, updatedAt, lastSyncedAt, isDeleted',
      gameSessions: '++id, supabaseId, runId, playedAt, createdAt, updatedAt, lastSyncedAt',
      episodeProgress: '++id, supabaseId, runId, episodeNumber, watchedAt, createdAt, lastSyncedAt',
      chapterProgress: '++id, supabaseId, runId, chapterNumber, readAt, createdAt, lastSyncedAt',
      // Remove mediaLogs
      mediaLogs: null
    });

    // Version 11: Add compound indexes for episode and chapter progress
    this.version(11).stores({
      mediaTypes: '++id, name, createdAt',
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, externalApi, statusId, score, releaseYear, createdAt, updatedAt, lastSyncedAt, isDeleted',
      animeMetadata: 'mediaItemId, malId',
      mangaMetadata: 'mediaItemId, malId',
      gameMetadata: 'mediaItemId, igdbId',
      movieMetadata: 'mediaItemId, tmdbId',
      mediaImages: '++id, supabaseId, mediaItemId, url, createdAt, updatedAt, lastSyncedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, mediaTypeId, createdAt, updatedAt, lastSyncedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, lastSyncedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, lastSyncedAt, isDeleted',
      folders: '++id, supabaseId, name, order, createdAt, updatedAt, lastSyncedAt, isDeleted',
      mediaRuns: '++id, supabaseId, userId, mediaItemId, runNumber, startDate, endDate, createdAt, updatedAt, lastSyncedAt, isDeleted',
      gameSessions: '++id, supabaseId, runId, playedAt, createdAt, updatedAt, lastSyncedAt',
      // Add compound indexes for querying by runId+episodeNumber and runId+chapterNumber
      episodeProgress: '++id, supabaseId, runId, episodeNumber, [runId+episodeNumber], watchedAt, createdAt, lastSyncedAt',
      chapterProgress: '++id, supabaseId, runId, chapterNumber, [runId+chapterNumber], readAt, createdAt, lastSyncedAt'
    });

    // Version 12: Add profiles table and move lastSyncedAt there
    this.version(12).stores({
      profiles: 'id, lastSyncedAt, updatedAt',
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, statusId, score, createdAt, updatedAt, isDeleted',
      mediaImages: '++id, supabaseId, mediaItemId, createdAt, updatedAt, isDeleted',
      lists: '++id, supabaseId, name, folderId, mediaTypeId, createdAt, updatedAt, isDeleted',
      categories: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      watchSources: '++id, supabaseId, name, baseUrl, createdAt, updatedAt, isDeleted',
      folders: '++id, supabaseId, name, order, createdAt, updatedAt, isDeleted',
      mediaRuns: '++id, supabaseId, userId, mediaItemId, runNumber, createdAt, updatedAt, isDeleted',
      gameSessions: '++id, supabaseId, runId, playedAt, createdAt, updatedAt',
      episodeProgress: '++id, supabaseId, runId, episodeNumber, [runId+episodeNumber], watchedAt, createdAt, updatedAt',
      chapterProgress: '++id, supabaseId, runId, chapterNumber, [runId+chapterNumber], readAt, createdAt, updatedAt'
    });

    // Version 13: Version-based Optimistic Concurrency
    this.version(13).stores({
      syncConflicts: '++id, entityType, createdAt',
      profiles: 'id, updatedAt, version', 
      mediaItems: '++id, supabaseId, mediaTypeId, externalId, statusId, version, isDeleted',
      lists: '++id, supabaseId, folderId, mediaTypeId, version, isDeleted',
      categories: '++id, supabaseId, version, isDeleted',
      watchSources: '++id, supabaseId, version, isDeleted',
      folders: '++id, supabaseId, version, isDeleted',
      mediaRuns: '++id, supabaseId, userId, mediaItemId, runNumber, isDeleted',
      gameSessions: '++id, supabaseId, runId, playedAt',
      episodeProgress: '++id, supabaseId, runId, episodeNumber, [runId+episodeNumber]',
      chapterProgress: '++id, supabaseId, runId, chapterNumber, [runId+chapterNumber]'
    }).upgrade(async trans => {
      // Initialize version to 1 for all existing records to enable comparison logic
      const tables = ['mediaItems', 'lists', 'categories', 'watchSources', 'folders', 'profiles'];
      for (const tableName of tables) {
        await trans.table(tableName).toCollection().modify(item => {
          if (item.version === undefined || item.version === null) {
            item.version = 1;
          }
        });
      }
    });

    // Version 14: Fix missing indexes from v13 that caused SchemaErrors and sync issues
    this.version(14).stores({
      mediaItems: '++id, supabaseId, mediaTypeId, title, externalId, statusId, version, isDeleted',
      lists: '++id, supabaseId, name, folderId, mediaTypeId, version, isDeleted',
      categories: '++id, supabaseId, name, version, isDeleted',
      watchSources: '++id, supabaseId, name, version, isDeleted',
      folders: '++id, supabaseId, name, version, isDeleted',
    });
  }

  async seedDefaultCategories(): Promise<void> {
    const count = await this.categories.count();
    
    if (count === 0) {
      const now = new Date();
      const categoriesToAdd = DEFAULT_CATEGORIES.map(category => ({
        ...category,
        version: 1,
        createdAt: now,
        updatedAt: now
      }));
      
      await this.categories.bulkAdd(categoriesToAdd);
      console.log('Default categories seeded successfully');
    }
  }
}

export const db = new AnimeTrackerDatabase();
