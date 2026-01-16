import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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

  async addMovieFromTmdb(tmdbMovie: TMDBMovie, statusId: number): Promise<number> {
    const mediaItem = this.tmdbService.convertTMDBToMediaItem(tmdbMovie, statusId);
    const id = await this.mediaService.addMedia(mediaItem);
    
    const metadata: MovieMetadata = {
      mediaItemId: id,
      directors: [], // Need separate request or credits mapping
      cast: [],
      studios: [],
      tmdbId: tmdbMovie.id,
    };
    
    await this.mediaService.saveMovieMetadata(metadata);
    return id;
  }

  async updateMovie(id: number, updates: Partial<MediaItem>): Promise<number> {
    return this.mediaService.updateMedia(id, updates);
  }

  async deleteMovie(id: number): Promise<void> {
    return this.mediaService.deleteMedia(id);
  }
}
