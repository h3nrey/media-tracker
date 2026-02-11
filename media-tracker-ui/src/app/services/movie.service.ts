import { Injectable, inject } from '@angular/core';
import { Observable, map, firstValueFrom, from } from 'rxjs';
import { MediaService } from './media.service';
import { TmdbService, TMDBMovie } from './tmdb.service';
import { MediaItem, MediaType } from '../models/media-type.model';
import { MovieMetadata } from '../models/movie-metadata.model';
import { db } from './database.service';
import { liveQuery } from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private mediaService = inject(MediaService);
  private tmdbService = inject(TmdbService);

  constructor() {}

  getAllMovies$(): Observable<MediaItem[]> {
    return this.mediaService.getAllMedia$(MediaType.MOVIE);
  }

  getMoviesByStatus$(statusId: number): Observable<MediaItem[]> {
    return from(liveQuery(async () => {
      const items = await db.mediaItems
        .where('statusId').equals(statusId)
        .and(item => item.mediaTypeId === MediaType.MOVIE)
        .toArray();
      const withMeta = await Promise.all(items.map(async item => {
        const meta = await db.movieMetadata.get(item.id!);
        return {
          ...item,
          directors: meta?.directors || [],
          cast: meta?.cast || []
        } as MediaItem;
      }));
      return withMeta.filter(m => !m.isDeleted);
    }));
  }

  async getMovieById(id: number): Promise<MediaItem | undefined> {
    const item = await db.mediaItems.get(id);
    if (!item || item.mediaTypeId !== MediaType.MOVIE) return undefined;
    const meta = await db.movieMetadata.get(id);
    const runs = await db.mediaRuns.where('mediaItemId').equals(id).toArray();
    return {
      ...item,
      directors: meta?.directors || [],
      cast: meta?.cast || [],
      tmdbId: meta?.tmdbId,
      runs: runs.filter(r => !r.isDeleted)
    } as MediaItem;
  }

  getMovieById$(id: number): Observable<MediaItem | undefined> {
    return from(liveQuery(() => this.getMovieById(id)));
  }

  async addMovieFromTmdb(tmdbMovie: TMDBMovie, statusId: number): Promise<number> {
    const detailed = await firstValueFrom(this.tmdbService.getMovieById(tmdbMovie.id));
    const movieData = detailed || tmdbMovie;
    
    const mediaItem: any = this.tmdbService.convertTMDBToMediaItem(movieData, statusId);
    
    // Extract directors
    const directors = (movieData as any).credits?.crew?.filter((c: any) => c.job === 'Director').map((d: any) => d.name) || [];
    mediaItem.studios = directors; // Using studios field as generic director container for now

    const id = await this.mediaService.addMedia(mediaItem);
    
    const metadata: MovieMetadata = {
      mediaItemId: id,
      directors: directors,
      cast: (movieData as any).credits?.cast?.slice(0, 5).map((c: any) => c.name) || [],
      studios: (movieData as any).production_companies?.map((c: any) => c.name) || [],
      tmdbId: tmdbMovie.id,
      progressTotal: (movieData as any).runtime || 0
    };
    
    await this.mediaService.saveMovieMetadata(metadata);
    return id;
  }

  async updateMovie(id: number, updates: Partial<MediaItem>): Promise<number> {
    return this.mediaService.updateMedia(id, updates);
  }

  async updateMovieStatus(id: number, statusId: number): Promise<number> {
    return this.mediaService.updateMedia(id, { statusId });
  }

  async deleteMovie(id: number): Promise<void> {
    return this.mediaService.deleteMedia(id);
  }
}
