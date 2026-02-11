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

const RECOMMENDED_PLATFORMS = {
  NES: 18,
  SNES: 19,
  MASTER_SYSTEM: 64,
  MEGA_DRIVE: 29,
  PS1: 7,
  PS2: 8,
  PS3: 9,
  PSP: 38,
  PS4: 48,
  GAMECUBE: 21,
  N64: 4,
  WII: 5,
  SWITCH: 130,
  PC: 6,
  SATURN: 32,
  DREAMCAST: 23,
  GAMEBOY: 33,
  GAMEBOY_COLOR: 22,
  GAMEBOY_ADVANCE: 24,
  NDS: 20,
  N3DS: 37,
  WII_U: 41,
  JAGUAR: 62
};

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

  getGenres(): Observable<any[]> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = this.getHeaders(token);
        const body = `fields name; limit 50; sort name asc;`;
        return this.http.post<any[]>(`${this.API_URL}/genres`, body, { headers });
      }),
      catchError(err => {
        console.error('Error fetching IGDB genres:', err);
        return of([]);
      })
    );
  }

  getPlatforms(): Observable<any[]> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = this.getHeaders(token);
        const platformIds = Object.values(RECOMMENDED_PLATFORMS);
        const body = `fields name, id; limit 50; sort name asc; where id = (${platformIds.join(',')});`;
        return this.http.post<any[]>(`${this.API_URL}/platforms`, body, { headers });
      }),
      catchError(err => {
        console.error('Error fetching IGDB platforms:', err);
        return of([]);
      })
    );
  }

  getRecommendations(params: { 
    genres?: number[], 
    platforms?: number[], 
    collections?: number[],
    excludeCollections?: number[],
    gameModes?: number[],
    excludeGameModes?: number[],
    startDate?: string, 
    endDate?: string, 
    sort?: string,
    offset?: number,
    limit?: number 
  }): Observable<IGDBGame[]> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = this.getHeaders(token);
        const limit = params.limit || 20;
        const offset = params.offset || 0;
        const sort = params.sort || 'rating desc';
        let whereClauses: string[] = ['rating > 70', 'rating_count > 5'];
        
        if (params.genres && params.genres.length > 0) {
          whereClauses.push(`genres = (${params.genres.join(',')})`);
        }

        if (params.platforms && params.platforms.length > 0) {
          whereClauses.push(`platforms = (${params.platforms.join(',')})`);
        }

        if (params.collections && params.collections.length > 0) {
          whereClauses.push(`collections = (${params.collections.join(',')})`);
        }

        if (params.excludeCollections && params.excludeCollections.length > 0) {
          whereClauses.push(`collections != (${params.excludeCollections.join(',')})`);
        }

        if (params.gameModes && params.gameModes.length > 0) {
          whereClauses.push(`game_modes = (${params.gameModes.join(',')})`);
        }

        if (params.excludeGameModes && params.excludeGameModes.length > 0) {
          whereClauses.push(`game_modes != (${params.excludeGameModes.join(',')})`);
        }
        
        if (params.startDate) {
          const startTimestamp = Math.floor(new Date(params.startDate).getTime() / 1000);
          whereClauses.push(`first_release_date >= ${startTimestamp}`);
        }
        
        if (params.endDate) {
          const endTimestamp = Math.floor(new Date(params.endDate).getTime() / 1000);
          whereClauses.push(`first_release_date <= ${endTimestamp}`);
        }

        const body = `fields name, summary, cover.url, genres.name, involved_companies.company.name, involved_companies.developer, first_release_date, platforms.name, screenshots.url, videos.video_id, rating; 
                      where ${whereClauses.join(' & ')}; 
                      sort ${sort}; 
                      limit ${limit};
                      offset ${offset};`;

        return this.http.post<IGDBGame[]>(`${this.API_URL}/games`, body, { headers });
      }),
      catchError(err => {
        console.error('Error fetching IGDB recommendations:', err);
        return of([]);
      })
    );
  }

  getRandomGame(): Observable<IGDBGame | null> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = this.getHeaders(token);
        // Get a random high-rated game by using a random offset
        const totalCount = 500; // Assume 500 high rated games
        const randomOffset = Math.floor(Math.random() * totalCount);
        const body = `fields name, summary, cover.url, genres.name, involved_companies.company.name, involved_companies.developer, first_release_date, platforms.name, screenshots.url, videos.video_id, rating; 
                      where rating > 80 & rating_count > 10; 
                      limit 1; 
                      offset ${randomOffset};`;

        return this.http.post<IGDBGame[]>(`${this.API_URL}/games`, body, { headers }).pipe(
          map(games => games.length > 0 ? games[0] : null)
        );
      }),
      catchError(err => {
        console.error('Error fetching random IGDB game:', err);
        return of(null);
      })
    );
  }
}
