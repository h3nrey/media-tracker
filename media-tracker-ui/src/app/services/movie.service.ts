import { Injectable, inject } from '@angular/core';
import { Observable, map, firstValueFrom, from } from 'rxjs';
import { MediaService } from './media.service';
import { TmdbService, TMDBMovie } from './tmdb.service';
import { MediaItem, MediaType } from '../models/media-type.model';
import { MovieMetadata } from '../models/movie-metadata.model';

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
    return this.mediaService.getMediaByStatus$(statusId, MediaType.MOVIE);
  }

  async getMovieById(id: number): Promise<MediaItem | undefined> {
    return this.mediaService.getMediaById(id);
  }

  getMovieById$(id: number): Observable<MediaItem | undefined> {
    return from(this.getMovieById(id));
  }

  async addMovieFromTmdb(tmdbMovie: TMDBMovie, statusId: number): Promise<number> {
    const detailed = await firstValueFrom(this.tmdbService.getMovieById(tmdbMovie.id));
    const movieData = detailed || tmdbMovie;
    
    const mediaItem: any = this.tmdbService.convertTMDBToMediaItem(movieData, statusId);
    
    // Extract directors
    const directors = (movieData as any).credits?.crew?.filter((c: any) => c.job === 'Director').map((d: any) => d.name) || [];
    mediaItem.studios = directors; 

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
