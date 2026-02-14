import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, BehaviorSubject, combineLatest, map, of, catchError, switchMap, firstValueFrom } from 'rxjs';
import { MediaItem, MediaFilterParams, MediaType, MediaGalleryImage } from '../models/media-type.model';
import { Category } from '../models/status.model';
import { MalService } from './mal.service';
import { IgdbService, IGDBGame } from './igdb.service';
import { TmdbService } from './tmdb.service';
import { Router } from '@angular/router';
import { CategoryService } from './status.service';
import { JikanAnime } from '../models/mal-anime.model';
import { ReviewService } from './review.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { AnimeMetadata } from '../models/anime-metadata.model';
import { MangaMetadata } from '../models/manga-metadata.model';
import { GameMetadata } from '../models/game-metadata.model';
import { MovieMetadata } from '../models/movie-metadata.model';

export interface MediaByCategory {
  category: Category;
  media: MediaItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private malService = inject(MalService);
  private igdbService = inject(IgdbService);
  private tmdbService = inject(TmdbService);
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  private reviewService = inject(ReviewService);
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  public filterUpdate$ = new BehaviorSubject<number>(0);
  public metadataSyncRequested = signal(false);

  constructor() {}

  triggerFilterUpdate() {
    this.filterUpdate$.next(Date.now());
  }

  private mapFromSupabase(item: any): MediaItem {
    return {
      id: item.id,
      supabaseId: item.id,
      mediaTypeId: item.media_type_id,
      title: item.title,
      coverImage: item.cover_image,
      bannerImage: item.banner_image,
      externalId: item.external_id,
      externalApi: item.external_api,
      statusId: item.status_id,
      score: item.score,
      genres: item.genres || [],
      releaseYear: item.release_year,
      startDate: item.start_date,
      endDate: item.end_date,
      trailerUrl: item.trailer_url,
      notes: item.notes,
      sourceLinks: item.source_links || [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      version: item.version || 1,
      progressCurrent: item.progress_current,
      progressTotal: item.progress_total,
      isDeleted: item.is_deleted
    };
  }

  getAllMedia$(mediaTypeId?: number | null): Observable<MediaItem[]> {
    return combineLatest([
      this.filterUpdate$,
      of(null) // trigger once
    ]).pipe(
      switchMap(() => from(this.getAllMedia(mediaTypeId)))
    );
  }

  async getAllMedia(mediaTypeId?: number | null): Promise<MediaItem[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    let query = this.supabaseService.client
      .from('media_items')
      .select('*, media_runs(*), media_images(*)')
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (mediaTypeId) {
      query = query.eq('media_type_id', mediaTypeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching media from Supabase:', error);
      return [];
    }

    const items = (data || []).map(item => {
      const mediaItem = this.mapFromSupabase(item);
      return {
        ...mediaItem,
        runs: (item.media_runs || []).filter((r: any) => !r.is_deleted),
        screenshots: (item.media_images || []).filter((s: any) => !s.is_deleted)
      };
    });

    const supabaseIds = items.map(m => m.id!);
    if (supabaseIds.length === 0) return items;

    try {
      const reviews = await firstValueFrom(this.reviewService.getReviewsForMediaList$(supabaseIds));
      return items.map(item => ({
        ...item,
        reviews: reviews.filter(r => r.media_item_id === item.id)
      }));
    } catch {
      return items;
    }
  }

  getMediaByStatus$(statusId: number, mediaTypeId?: number | null): Observable<MediaItem[]> {
    return this.getAllMedia$(mediaTypeId).pipe(
      map(items => items.filter(m => m.statusId === statusId))
    );
  }

  getMediaGroupedByCategory$(categories: Category[], mediaTypeId?: number | null): Observable<MediaByCategory[]> {
    return this.getAllMedia$(mediaTypeId).pipe(
      map(allMedia => 
        categories.map(category => ({
          category,
          media: allMedia.filter(m => m.statusId === category.id)
        }))
      )
    );
  }

  getFilteredMediaGroupedByCategory$(
    categories: Category[],
    filterFn: (media: MediaItem[]) => MediaItem[],
    mediaTypeId?: number | null
  ): Observable<MediaByCategory[]> {
    return this.getAllMedia$(mediaTypeId).pipe(
      map(allMedia => {
        const filteredMedia = filterFn(allMedia);
        return categories.map(category => ({
          category,
          media: filteredMedia.filter(m => m.statusId === category.id)
        }));
      })
    );
  }

  async getMediaById(id: number): Promise<MediaItem | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('media_items')
      .select('*, media_runs(*), media_images(*)')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    const mediaItem = this.mapFromSupabase(data);
    return {
      ...mediaItem,
      runs: (data.media_runs || []).filter((r: any) => !r.is_deleted),
      screenshots: (data.media_images || []).filter((s: any) => !s.is_deleted)
    };
  }

  getMediaById$(id: number): Observable<MediaItem | undefined> {
    return from(this.getMediaById(id));
  }

  async getMediaBySupabaseId(supabaseId: number): Promise<MediaItem | undefined> {
    return this.getMediaById(supabaseId);
  }

  async getMediaByExternalId(externalId: number, externalApi: string): Promise<MediaItem | undefined> {
    const user = this.authService.currentUser();
    if (!user) return undefined;

    const { data, error } = await this.supabaseService.client
      .from('media_items')
      .select('*')
      .eq('external_id', externalId)
      .eq('external_api', externalApi)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !data) return undefined;
    return this.mapFromSupabase(data);
  }

  async addMedia(media: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const { runs, screenshots, ...rest } = media;

    // Safety check: prevent duplicates by externalId
    if (rest.externalId && rest.externalApi) {
      const existing = await this.getMediaByExternalId(rest.externalId, rest.externalApi);
      if (existing) return existing.id!;
    }

    const supabaseData = {
      user_id: user.id,
      media_type_id: rest.mediaTypeId,
      title: rest.title,
      cover_image: rest.coverImage,
      banner_image: rest.bannerImage,
      external_id: rest.externalId,
      external_api: rest.externalApi,
      status_id: rest.statusId,
      score: rest.score,
      genres: rest.genres,
      release_year: rest.releaseYear,
      start_date: rest.startDate,
      end_date: rest.endDate,
      trailer_url: rest.trailerUrl,
      notes: rest.notes,
      source_links: rest.sourceLinks,
      version: rest.version || 1,
      progress_current: rest.progressCurrent,
      progress_total: rest.progressTotal,
      is_deleted: false
    };

    const { data, error } = await this.supabaseService.client
      .from('media_items')
      .insert([supabaseData])
      .select()
      .single();

    if (error) throw error;

    if (runs && runs.length > 0) {
      const runsToAdd = runs.map(run => ({
        media_item_id: data.id,
        user_id: user.id,
        run_number: run.runNumber,
        rating: run.rating,
        start_date: run.startDate,
        end_date: run.endDate,
        notes: run.notes,
        is_deleted: false
      }));
      await this.supabaseService.client.from('media_runs').insert(runsToAdd);
    }

    if (screenshots && screenshots.length > 0) {
      const imagesToAdd = screenshots.map(img => ({
        media_item_id: data.id,
        user_id: user.id,
        url: img.url,
        description: img.description,
        is_deleted: false
      }));
      await this.supabaseService.client.from('media_images').insert(imagesToAdd);
    }

    this.triggerFilterUpdate();
    return data.id;
  }

  async updateMedia(id: number, updates: Partial<MediaItem>): Promise<number> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const { runs, screenshots, ...rest } = updates;

    const supabaseData: any = {
      updated_at: new Date().toISOString()
    };

    if (rest.title !== undefined) supabaseData.title = rest.title;
    if (rest.statusId !== undefined) supabaseData.status_id = rest.statusId;
    if (rest.score !== undefined) supabaseData.score = rest.score;
    if (rest.notes !== undefined) supabaseData.notes = rest.notes;
    if (rest.progressCurrent !== undefined) supabaseData.progress_current = rest.progressCurrent;
    if (rest.progressTotal !== undefined) supabaseData.progress_total = rest.progressTotal;
    if (rest.genres !== undefined) supabaseData.genres = rest.genres;
    if (rest.version !== undefined) supabaseData.version = rest.version;

    const { error } = await this.supabaseService.client
      .from('media_items')
      .update(supabaseData)
      .eq('id', id);

    if (error) throw error;

    this.triggerFilterUpdate();
    return id;
  }

  async updateMediaStatus(id: number, statusId: number): Promise<number> {
    const { error } = await this.supabaseService.client
      .from('media_items')
      .update({ status_id: statusId, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    this.triggerFilterUpdate();
    return id;
  }

  async updateMediaStatusWithSync(id: number, localCategoryId: number): Promise<number> {
    return this.updateMediaStatus(id, localCategoryId);
  }

  async deleteMedia(id: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('media_items')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    this.triggerFilterUpdate();
  }

  // Metadata operations (storing in Supabase)
  async getAnimeMetadata(mediaItemId: number): Promise<AnimeMetadata | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('anime_metadata')
      .select('*')
      .eq('media_item_id', mediaItemId)
      .maybeSingle();
    
    if (error || !data) return undefined;
    return {
      mediaItemId: data.media_item_id,
      malId: data.mal_id,
      studios: data.studios || [],
      totalEpisodes: data.total_episodes
    };
  }

  async getMangaMetadata(mediaItemId: number): Promise<MangaMetadata | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('manga_metadata')
      .select('*')
      .eq('media_item_id', mediaItemId)
      .maybeSingle();
    
    if (error || !data) return undefined;
    return {
      mediaItemId: data.media_item_id,
      authors: data.authors || [],
      publishers: data.publishers || [],
      malId: data.mal_id
    };
  }

  async getGameMetadata(mediaItemId: number): Promise<GameMetadata | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('game_metadata')
      .select('*')
      .eq('media_item_id', mediaItemId)
      .maybeSingle();
    
    if (error || !data) return undefined;
    return {
      mediaItemId: data.media_item_id,
      igdbId: data.igdb_id,
      developers: data.developers || [],
      publishers: data.publishers || [],
      platforms: data.platforms || []
    };
  }

  async getMovieMetadata(mediaItemId: number): Promise<MovieMetadata | undefined> {
    const { data, error } = await this.supabaseService.client
      .from('movie_metadata')
      .select('*')
      .eq('media_item_id', mediaItemId)
      .maybeSingle();
    
    if (error || !data) return undefined;
    return {
      mediaItemId: data.media_item_id,
      tmdbId: data.tmdb_id,
      directors: data.directors || [],
      cast: data.cast || [],
      studios: data.studios || []
    };
  }

  async saveAnimeMetadata(metadata: AnimeMetadata): Promise<void> {
    const data = {
      media_item_id: metadata.mediaItemId,
      mal_id: metadata.malId,
      studios: metadata.studios,
      total_episodes: metadata.totalEpisodes
    };
    await this.supabaseService.client.from('anime_metadata').upsert(data);
  }

  async saveMangaMetadata(metadata: MangaMetadata): Promise<void> {
    const data = {
      media_item_id: metadata.mediaItemId,
      authors: metadata.authors,
      publishers: metadata.publishers,
      mal_id: metadata.malId
    };
    await this.supabaseService.client.from('manga_metadata').upsert(data);
  }

  async saveGameMetadata(metadata: GameMetadata): Promise<void> {
    const data = {
      media_item_id: metadata.mediaItemId,
      igdb_id: metadata.igdbId,
      developers: metadata.developers,
      publishers: metadata.publishers,
      platforms: metadata.platforms
    };
    await this.supabaseService.client.from('game_metadata').upsert(data);
  }

  async saveMovieMetadata(metadata: MovieMetadata): Promise<void> {
    const data = {
      media_item_id: metadata.mediaItemId,
      tmdb_id: metadata.tmdbId,
      directors: metadata.directors,
      cast: metadata.cast,
      studios: metadata.studios
    };
    await this.supabaseService.client.from('movie_metadata').upsert(data);
  }

  filterMediaList(list: MediaItem[], params: MediaFilterParams): MediaItem[] {
    let result = [...list];

    if (params.query) {
      const q = params.query.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(q));
    }

    if (params.genres && params.genres.length > 0) {
      result = result.filter(m => m.genres && params.genres!.every((g: string) => m.genres.includes(g)));
    }

    if (params.studios && params.studios.length > 0) {
      result = result.filter(m => m.studios && params.studios!.some((s: string) => m.studios?.includes(s)));
    }

    if (params.year) {
      result = result.filter(m => m.releaseYear === params.year);
    }

    if (params.activityYear) {
      // Activity year logic might need adjustment
    }

    if (params.sortBy) {
      const mult = params.sortOrder === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        let valA: any = a[params.sortBy as keyof MediaItem];
        let valB: any = b[params.sortBy as keyof MediaItem];
        
        if (params.sortBy === ('updated' as any)) {
            valA = new Date(a.updatedAt || 0).getTime();
            valB = new Date(b.updatedAt || 0).getTime();
        } else if (params.sortBy === 'title') {
            return a.title.localeCompare(b.title) * mult;
        }

        if (valA < valB) return -1 * mult;
        if (valA > valB) return 1 * mult;
        return 0;
      });
    }

    return result;
  }

  getCompletedMedia(list: MediaItem[], year?: number): MediaItem[] {
    const getEffectiveCompletionDate = (item: MediaItem): Date | null => {
      if (item.endDate) {
        const d = new Date(item.endDate);
        return isNaN(d.getTime()) ? null : d;
      }
      if (item.runs && item.runs.length > 0) {
        const lastRun = item.runs.sort((a: any, b: any) => 
          new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime()
        )[0];
        if (lastRun?.endDate) {
          const d = new Date(lastRun.endDate);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      return null;
    };

    const completedWithDates = (list || [])
      .map(item => ({ item, date: getEffectiveCompletionDate(item) }))
      .filter(({ date }) => {
        if (!date) return false;
        if (!year) return true;
        return date.getFullYear() === year;
      });

    completedWithDates.sort((a, b) => b.date!.getTime() - a.date!.getTime());
    return completedWithDates.map(c => c.item);
  }

  async importMediaFromApi(apiItem: any): Promise<number> {
    const categories = await firstValueFrom(this.categoryService.getAllCategories$());
    const backlogCat = categories.find((c: Category) => 
      c.name.toLowerCase().includes('plan') || 
      c.name.toLowerCase().includes('backlog')
    ) || categories[0];
    
    let mediaItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>;
    let id: number;

    if (apiItem._type === 'anime') {
      mediaItem = this.malService.convertJikanToAnime(apiItem as JikanAnime, backlogCat.id!);
      id = await this.addMedia({ 
        ...mediaItem, 
        externalId: (apiItem as JikanAnime).mal_id, 
        externalApi: 'mal' 
      });
    } else {
      mediaItem = this.igdbService.convertIGDBToMediaItem(apiItem as IGDBGame, backlogCat.id!);
      id = await this.addMedia(mediaItem);
      const metadata = {
        mediaItemId: id,
        igdbId: apiItem.id,
        developers: apiItem.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company.name) || [],
        publishers: apiItem.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company.name) || [],
        platforms: apiItem.platforms?.map((p: any) => p.name) || [],
      };
      await this.saveGameMetadata(metadata);
    }
    
    return id;
  }

  filterLocalMedia(query: string, mediaTypeId: number | null, allMedia: MediaItem[], excludedIds: number[]): MediaItem[] {
    const q = query.toLowerCase();
    if (!q || q.length < 2) return [];
    
    return allMedia.filter(m => 
      m.title.toLowerCase().includes(q) && 
      !excludedIds.includes(m.id!) &&
      (!mediaTypeId || m.mediaTypeId === mediaTypeId)
    ).slice(0, 5);
  }

  filterApiResults(apiResults: any[], allMedia: MediaItem[]): any[] {
    return apiResults.filter(api => {
      if (api._type === 'anime') {
        const localExternalIds = allMedia
          .filter(m => m.mediaTypeId === MediaType.ANIME)
          .map(m => m.externalId);
        return !localExternalIds.includes(api.mal_id);
      } else {
        const localExternalIds = allMedia
          .filter(m => m.mediaTypeId === MediaType.GAME)
          .map(m => m.externalId);
        return !localExternalIds.includes(api.id);
      }
    });
  }

  searchExternalApi(query: string, type: number | null): Observable<any[]> {
    if (!query || query.length < 3) return of([]);
    const searches = [];

    if (!type || type === MediaType.ANIME) {
      searches.push(this.malService.searchAnime(query).pipe(
        map(results => results.map(a => ({ ...a, _type: 'anime' }))),
        catchError(() => of([]))
      ));
    }

    if (!type || type === MediaType.GAME) {
      searches.push(this.igdbService.searchGames(query).pipe(
        map(results => results.map(g => ({ ...g, _type: 'game' }))),
        catchError(() => of([]))
      ));
    }

    if (!type || type === MediaType.MOVIE) {
      searches.push(this.tmdbService.searchMovies(query).pipe(
        map(results => results.map((m: any) => ({ ...m, _type: 'movie' }))),
        catchError(() => of([]))
      ));
    }

    return combineLatest(searches).pipe(map(results => results.flat()));
  }

  getMediaImages$(mediaItemId?: number): Observable<MediaGalleryImage[]> {
    return this.filterUpdate$.pipe(
      switchMap(() => from(this.getMediaImages(mediaItemId)))
    );
  }

  async getMediaImages(mediaItemId?: number): Promise<MediaGalleryImage[]> {
    const user = this.authService.currentUser();
    if (!user) return [];

    let query = this.supabaseService.client
      .from('media_images')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (mediaItemId) query = query.eq('media_item_id', mediaItemId);

    const { data, error } = await query;
    if (error) return [];

    return (data || []).map(img => ({
      id: img.id,
      mediaItemId: img.media_item_id,
      url: img.url,
      description: img.description,
      createdAt: new Date(img.created_at),
      updatedAt: new Date(img.updated_at),
      isDeleted: img.is_deleted
    }));
  }

  getMediaImagesByYear$(year: number, mediaTypeId?: number | null): Observable<MediaGalleryImage[]> {
    return from(this.getAllMedia(mediaTypeId)).pipe(
      map(allMedia => {
        const activeMedia = this.filterMediaList(allMedia, { activityYear: year });
        const activeIds = activeMedia.map(m => m.id).filter(id => !!id) as number[];
        return [];
      })
    );
  }
}
