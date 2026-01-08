import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map, switchMap, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

// Simplified IGDB Game model
export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  genres?: Array<{ id: number, name: string }>;
  involved_companies?: Array<{ company: { name: string }, developer: boolean, publisher: boolean }>;
  platforms?: Array<{ name: string }>;
  first_release_date?: number;
  screenshots?: Array<{ id: number, url: string }>;
  videos?: Array<{ id: number, video_id: string }>;
}

interface TwitchToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class IgdbService {
  private http = inject(HttpClient);
  
  private readonly CLIENT_ID = environment.igdbClientId;
  private readonly CLIENT_SECRET = environment.igdbClientSecret;
  private readonly AUTH_URL = 'https://id.twitch.tv/oauth2/token';
  private readonly PHYSICAL_API_URL = 'https://api.igdb.com/v4';
  
  // No navegador, usamos o caminho do proxy. Em produção/node, usaria a URL física.
  private readonly API_URL = '/igdb-api'; 

  private accessToken: string | null = null;
  private tokenExpires: number = 0;

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    const saved = localStorage.getItem('igdb_token');
    if (saved) {
      const data = JSON.parse(saved);
      this.accessToken = data.token;
      this.tokenExpires = data.expires;
    }
  }

  private getValidToken(): Observable<string> {
    const now = Math.floor(Date.now() / 1000);
    
    if (this.accessToken && this.tokenExpires > now + 60) {
      return of(this.accessToken);
    }

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      console.error('IGDB API credentials missing in environment.ts');
      throw new Error('IGDB API credentials missing');
    }

    const params = new HttpParams()
      .set('client_id', this.CLIENT_ID)
      .set('client_secret', this.CLIENT_SECRET)
      .set('grant_type', 'client_credentials');
    
    return this.http.post<TwitchToken>(this.AUTH_URL, params).pipe(
      map(response => {
        this.accessToken = response.access_token;
        this.tokenExpires = Math.floor(Date.now() / 1000) + response.expires_in;
        
        localStorage.setItem('igdb_token', JSON.stringify({
          token: this.accessToken,
          expires: this.tokenExpires
        }));
        
        return this.accessToken;
      }),
      catchError(err => {
        console.error('Failed to get IGDB access token', err);
        throw err;
      }),
      shareReplay(1)
    );
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Client-ID': this.CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'text/plain'
    });
  }

  searchGames(query: string, limit: number = 10): Observable<IGDBGame[]> {
    if (!query || query.trim().length < 2) return of([]);

    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = this.getHeaders(token);
        // O IGDB espera a query pura no corpo do POST
        const body = `search "${query}"; fields name, summary, cover.url, genres.name, involved_companies.company.name, involved_companies.developer, first_release_date, platforms.name, screenshots.url, videos.video_id; limit ${limit};`;

        return this.http.post<IGDBGame[]>(`${this.API_URL}/games`, body, { headers });
      }),
      catchError(err => {
        console.error('IGDB search error:', err);
        return of([]);
      })
    );
  }

  getGameById(id: number): Observable<IGDBGame | null> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = this.getHeaders(token);
        const body = `fields name, summary, cover.url, genres.name, involved_companies.company.name, involved_companies.developer, first_release_date, platforms.name, screenshots.url, videos.video_id; where id = ${id};`;

        return this.http.post<IGDBGame[]>(`${this.API_URL}/games`, body, { headers }).pipe(
          map(games => games.length > 0 ? games[0] : null)
        );
      }),
      catchError(err => {
        console.error('IGDB getById error:', err);
        return of(null);
      })
    );
  }

  convertIGDBToMediaItem(game: IGDBGame, statusId: number) {
    const getCoverUrl = (url?: string) => {
      if (!url) return '';
      const fullUrl = url.startsWith('//') ? `https:${url}` : url;
      return fullUrl.replace('t_thumb', 't_cover_big');
    };

    const getBannerUrl = (game: IGDBGame) => {
      if (game.screenshots && game.screenshots.length > 0) {
        const url = game.screenshots[0].url;
        const fullUrl = url.startsWith('//') ? `https:${url}` : url;
        return fullUrl.replace('t_thumb', 't_screenshot_huge');
      }
      return '';
    };

    const getTrailerUrl = (game: IGDBGame) => {
      if (game.videos && game.videos.length > 0) {
        return `https://www.youtube.com/embed/${game.videos[0].video_id}`;
      }
      return '';
    };

    return {
      title: game.name,
      coverImage: getCoverUrl(game.cover?.url),
      bannerImage: getBannerUrl(game),
      trailerUrl: getTrailerUrl(game),
      externalId: game.id,
      externalApi: 'igdb',
      mediaTypeId: 3, // Game
      progress_current: 0,
      progress_total: 0,
      statusId: statusId,
      score: 0,
      genres: game.genres?.map(g => g.name) || [],
      studios: game.involved_companies?.filter(c => c.developer).map(c => c.company.name) || [],
      releaseYear: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined,
      notes: game.summary || '',
      platforms: game.platforms?.map(p => p.name) || []
    };
  }
}
