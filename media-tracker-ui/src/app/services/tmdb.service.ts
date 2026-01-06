import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';

export interface TMDBMovie {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  genre_ids?: number[];
  vote_average?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private http = inject(HttpClient);
  // These should be configured via environment variables
  private readonly API_KEY = '';
  private readonly BASE_URL = 'https://api.themoviedb.org/3';
  private readonly IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

  constructor() {}

  searchMovies(query: string, limit: number = 10): Observable<TMDBMovie[]> {
    if (!query || query.trim().length < 2) return of([]);
    
    if (!this.API_KEY) {
      console.warn('TMDB API Key not configured');
      return of([]);
    }

    const url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}`;
    
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
    const url = `${this.BASE_URL}/movie/${id}?api_key=${this.API_KEY}`;
    return this.http.get<TMDBMovie>(url).pipe(
      catchError(error => {
        console.error('Error fetching movie details:', error);
        return of(null);
      })
    );
  }

  convertTMDBToMediaItem(movie: TMDBMovie, statusId: number) {
    return {
      title: movie.title,
      coverImage: movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : undefined,
      externalId: movie.id,
      externalApi: 'tmdb',
      mediaTypeId: 4, // Movie
      progress_current: 0,
      progress_total: 1, // Movies typically are 0 (not watched) or 1 (watched)
      statusId: statusId,
      score: 0,
      genres: [], // Need genre mapping or another request to get genre names
      releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      notes: ''
    };
  }
}
