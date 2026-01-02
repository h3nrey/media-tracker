import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, debounceTime } from 'rxjs';
import { JikanAnimeSearchResponse, JikanAnime } from '../models/mal-anime.model';

@Injectable({
  providedIn: 'root'
})
export class MalService {
  private readonly JIKAN_API_BASE = 'https://api.jikan.moe/v4';
  private readonly RATE_LIMIT_DELAY = 1000; // Jikan has rate limits

  constructor(private http: HttpClient) {}

  /**
   * Search anime by title using Jikan API
   */
  searchAnime(query: string, limit: number = 10): Observable<JikanAnime[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const url = `${this.JIKAN_API_BASE}/anime?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`;
    
    return this.http.get<JikanAnimeSearchResponse>(url).pipe(
      debounceTime(this.RATE_LIMIT_DELAY),
      map(response => response.data),
      catchError(error => {
        console.error('Error searching anime:', error);
        return of([]);
      })
    );
  }

  /**
   * Get anime details by MAL ID
   */
  getAnimeById(malId: number): Observable<JikanAnime | null> {
    const url = `${this.JIKAN_API_BASE}/anime/${malId}`;
    
    return this.http.get<{ data: JikanAnime }>(url).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching anime details:', error);
        return of(null);
      })
    );
  }

  /**
   * Convert Jikan anime to our local anime format (helper)
   */
  convertJikanToAnime(jikanAnime: JikanAnime, statusId: number) {
    return {
      title: jikanAnime.title_english || jikanAnime.title,
      coverImage: jikanAnime.images.webp.large_image_url || jikanAnime.images.jpg.large_image_url,
      malId: jikanAnime.mal_id,
      episodesWatched: 0,
      totalEpisodes: jikanAnime.episodes || 0,
      statusId: statusId,
      score: 0,
      genres: jikanAnime.genres?.map(g => g.name) || [],
      releaseYear: jikanAnime.year || jikanAnime.aired?.prop?.from?.year,
      notes: ''
    };
  }
}
