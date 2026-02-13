import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TMDBMovie {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  genre_ids?: number[];
  genres?: { id: number, name: string }[];
  vote_average?: number;
  runtime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private http = inject(HttpClient);
  private readonly API_KEY = environment.tmdbApiKey;
  private readonly BASE_URL = 'https://api.themoviedb.org/3';
  private readonly IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
  private readonly ORIGINAL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

  constructor() {}

  searchMovies(query: string, limit: number = 10): Observable<TMDBMovie[]> {
    if (!query || query.trim().length < 2) return of([]);
    
    if (!this.API_KEY) {
      console.warn('TMDB API Key not configured');
      return of([]);
    }

    const url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;
    
    return this.http.get<{ results: TMDBMovie[] }>(url).pipe(
      map(response => response.results.slice(0, limit)),
      catchError(error => {
        console.error('Error searching movies:', error);
        return of([]);
      })
    );
  }

  getMovieById(id: number): Observable<TMDBMovie | null> {
    if (!this.API_KEY) return of(null);
    const url = `${this.BASE_URL}/movie/${id}?api_key=${this.API_KEY}&language=pt-BR&append_to_response=credits`;
    return this.http.get<TMDBMovie>(url).pipe(
      catchError(error => {
        console.error('Error fetching movie details:', error);
        return of(null);
      })
    );
  }

  convertTMDBToMediaItem(movie: any, statusId: number) {
    return {
      title: movie.title,
      coverImage: movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : undefined,
      bannerImage: movie.backdrop_path ? `${this.ORIGINAL_IMAGE_BASE_URL}${movie.backdrop_path}` : undefined,
      externalId: movie.id,
      externalApi: 'tmdb',
      mediaTypeId: 4, // Movie
      progressCurrent: 0,
      progressTotal: movie.runtime || 0, 
      statusId: statusId,
      score: 0,
      genres: movie.genres?.map((g: any) => g.name) || [],
      releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      notes: movie.overview || '',
      version: 1
    };
  }
}
