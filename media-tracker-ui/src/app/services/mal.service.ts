import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, debounceTime, firstValueFrom, delay, switchMap } from 'rxjs';
import { JikanAnimeSearchResponse, JikanAnime } from '../models/mal-anime.model';
import { JikanMangaSearchResponse, JikanManga } from '../models/jikan-manga.model';
import { Anime } from '../models/anime.model';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class MalService {
  private readonly JIKAN_API_BASE = 'https://api.jikan.moe/v4';
  private readonly RATE_LIMIT_DELAY = 1000; // Jikan has rate limits (1 request per second)
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  
  private cache = new Map<string, CacheEntry<any>>();
  private lastRequestTime = 0;

  constructor(private http: HttpClient) {}

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Jikan API cache cleared');
  }

  /**
   * Get cached data or fetch from API
   */
  private getCachedOrFetch<T>(cacheKey: string, fetchFn: () => Observable<T>): Observable<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if valid
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`Using cached data for: ${cacheKey}`);
      return of(cached.data);
    }

    // Enforce rate limiting
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delayNeeded = Math.max(0, this.RATE_LIMIT_DELAY - timeSinceLastRequest);

    console.log(`Fetching fresh data for: ${cacheKey} (delay: ${delayNeeded}ms)`);

    return of(null).pipe(
      delay(delayNeeded),
      map(() => {
        this.lastRequestTime = Date.now();
      }),
      switchMap(() => fetchFn()),
      map((data: T) => {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      })
    );
  }


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

  getRandomAnime(): Observable<JikanAnime | null> {
    const url = `${this.JIKAN_API_BASE}/random/anime`;
    return this.http.get<{ data: JikanAnime }>(url).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching random anime:', error);
        return of(null);
      })
    );
  }

  /**
   * Search manga by title using Jikan API
   */
  searchManga(query: string, limit: number = 10): Observable<JikanManga[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const url = `${this.JIKAN_API_BASE}/manga?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`;
    
    return this.http.get<JikanMangaSearchResponse>(url).pipe(
      debounceTime(this.RATE_LIMIT_DELAY),
      map(response => response.data),
      catchError(error => {
        console.error('Error searching manga:', error);
        return of([]);
      })
    );
  }

  /**
   * Get manga details by MAL ID
   */
  getMangaById(malId: number): Observable<JikanManga | null> {
    const url = `${this.JIKAN_API_BASE}/manga/${malId}`;
    
    return this.http.get<{ data: JikanManga }>(url).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching manga details:', error);
        return of(null);
      })
    );
  }

  /**
   * Get random manga from Jikan
   */
  getRandomManga(): Observable<JikanManga | null> {
    const url = `${this.JIKAN_API_BASE}/random/manga`;
    return this.http.get<{ data: JikanManga }>(url).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching random manga:', error);
        return of(null);
      })
    );
  }

  /**
   * Get filtered anime recommendations
   */
  getRecommendations(params: { genres?: number[], startDate?: string, endDate?: string, status?: string, limit?: number }): Observable<JikanAnime[]> {
    const cacheKey = `recommendations_${JSON.stringify(params)}`;
    
    return this.getCachedOrFetch(cacheKey, () => {
      const limit = params.limit || 20;
      let url = `${this.JIKAN_API_BASE}/anime?sfw=true&order_by=score&sort=desc&limit=${limit}`;
      
      if (params.genres && params.genres.length > 0) {
        url += `&genres=${params.genres.join(',')}`;
      }
      if (params.startDate) {
        url += `&start_date=${params.startDate}`;
      }
      if (params.endDate) {
        url += `&end_date=${params.endDate}`;
      }
      if (params.status) {
        url += `&status=${params.status}`;
      }

      return this.http.get<JikanAnimeSearchResponse>(url).pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error fetching recommendations:', error);
          return of([]);
        })
      );
    });
  }

  /**
   * Get all anime genres from Jikan
   */
  getGenres(): Observable<any[]> {
    const url = `${this.JIKAN_API_BASE}/genres/anime`;
    return this.http.get<{ data: any[] }>(url).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching genres:', error);
        return of([]);
      })
    );
  }

  /**
   * Fetch banner image from AniList using MAL ID
   */
  async getBannerFromAnilist(malId: number): Promise<string | null> {
    const query = `
      query ($idMal: Int) {
        Media (idMal: $idMal, type: ANIME) {
          bannerImage
        }
      }
    `;

    try {
      const response = await firstValueFrom(this.http.post<any>('https://graphql.anilist.co', {
        query,
        variables: { idMal: malId }
      }));
      return response.data?.Media?.bannerImage || null;
    } catch (error) {
      console.error('Error fetching AniList banner:', error);
      return null;
    }
  }

  /**
   * Convert Jikan anime to our local anime format (helper)
   */
  convertJikanToAnime(jikanAnime: JikanAnime, statusId: number) {
    return {
      title: jikanAnime.title_english || jikanAnime.title,
      coverImage: jikanAnime.images.webp.large_image_url || jikanAnime.images.jpg.large_image_url,
      externalId: jikanAnime.mal_id,
      externalApi: 'mal',
      mediaTypeId: 1, // Anime
      progressTotal: jikanAnime.episodes || 0,
      statusId: statusId,
      score: 0,
      genres: jikanAnime.genres?.map(g => g.name) || [],
      studios: jikanAnime.studios?.map(s => s.name) || [],
      releaseYear: jikanAnime.year || jikanAnime.aired?.prop?.from?.year,
      notes: ''
    };
  }

  /**
   * Convert Jikan manga to our local media item format
   */
  convertJikanToManga(jikanManga: JikanManga, statusId: number) {
    return {
      title: jikanManga.title_english || jikanManga.title,
      coverImage: jikanManga.images.webp.large_image_url || jikanManga.images.jpg.large_image_url,
      externalId: jikanManga.mal_id,
      externalApi: 'mal',
      mediaTypeId: 2, // Manga
      progress_current: 0,
      progress_total: jikanManga.chapters || 0,
      statusId: statusId,
      score: 0,
      genres: jikanManga.genres?.map(g => g.name) || [],
      releaseYear: jikanManga.published?.prop?.from?.year,
      notes: ''
    };
  }
}
