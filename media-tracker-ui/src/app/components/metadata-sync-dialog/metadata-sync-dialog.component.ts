import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, RefreshCw, CheckCircle, AlertCircle, Search } from 'lucide-angular';
import { MediaService } from '../../services/media.service';
import { AnimeService } from '../../services/anime.service';
import { MalService } from '../../services/mal.service';
import { Anime } from '../../models/anime.model';
import { firstValueFrom } from 'rxjs';
import { GameService } from '../../services/game.service';
import { IgdbService } from '../../services/igdb.service';
import { MediaType } from '../../models/media-type.model';
import { SelectComponent } from '../ui/select/select';

@Component({
  selector: 'app-metadata-sync-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SelectComponent],
  templateUrl: './metadata-sync-dialog.component.html',
  styleUrl: './metadata-sync-dialog.component.scss'
})
export class MetadataSyncDialogComponent {
  private mediaService = inject(MediaService);
  private animeService = inject(AnimeService);
  private malService = inject(MalService);
  private gameService = inject(GameService);
  private igdbService = inject(IgdbService);

  MediaType = MediaType;
  
  // Options: All (0), Anime (1), Game (3)
  syncOptions = [
      { value: 0, label: 'All Media' },
      { value: MediaType.ANIME, label: 'Anime Only' },
      { value: MediaType.GAME, label: 'Games Only' }
  ];
  selectedSyncType = signal<number>(0);

  isOpen = signal(false);
  isProcessing = signal(false);
  progress = signal(0);
  currentAnime = signal<string>('');
  stats = signal({ total: 0, updated: 0, skipped: 0, failed: 0 });

  readonly XIcon = X;
  readonly RefreshIcon = RefreshCw;
  readonly CheckIcon = CheckCircle;
  readonly AlertIcon = AlertCircle;
  readonly SearchIcon = Search;

  open() {
    this.isOpen.set(true);
    this.resetStats();
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (this.isProcessing()) return;
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  private resetStats() {
    this.stats.set({ total: 0, updated: 0, skipped: 0, failed: 0 });
    this.progress.set(0);
    this.currentAnime.set('');
  }

  async startSync() {
    this.isProcessing.set(true);
    const syncType = this.selectedSyncType();
    let animeList: any[] = [];
    let gameList: any[] = [];

    if (syncType === 0 || syncType === MediaType.ANIME) {
        animeList = await firstValueFrom(this.animeService.getAllAnime$());
    }
    
    // For games, we need to fetch them. Since GameService.getAllGames$ returns MediaItem[], we need to cast or just use them.
    if (syncType === 0 || syncType === MediaType.GAME) {
        gameList = await firstValueFrom(this.gameService.getAllGames$());
    }

    const total = animeList.length + gameList.length;
    this.stats.update(s => ({ ...s, total }));

    let processedCount = 0;

    // --- ANIME SYNC ---
    for (const anime of animeList) {
        processedCount++;
        this.currentAnime.set(`[Anime] ${anime.title}`);
        this.progress.set(Math.round((processedCount / total) * 100));

        try {
            await this.syncAnimeItem(anime);
        } catch (error) {
            console.error(`Error syncing anime ${anime.title}:`, error);
            this.stats.update(s => ({ ...s, failed: s.failed + 1 }));
        }

        // Rate limit for Jikan
        if (processedCount < total) await new Promise(r => setTimeout(r, 1200));
    }

    // --- GAME SYNC ---
    for (const game of gameList) {
        processedCount++;
        this.currentAnime.set(`[Game] ${game.title}`);
        this.progress.set(Math.round((processedCount / total) * 100));

        try {
            await this.syncGameItem(game);
        } catch (error) {
           console.error(`Error syncing game ${game.title}:`, error);
           this.stats.update(s => ({ ...s, failed: s.failed + 1 }));
        }
        
        // Rate limit for IGDB (4 requests/sec usually fine, but let's be safe with 250ms)
        if (processedCount < total) await new Promise(r => setTimeout(r, 250));
    }

    this.isProcessing.set(false);
    this.currentAnime.set('Sync Complete!');
    this.mediaService.triggerFilterUpdate();
  }

  private async syncAnimeItem(anime: any) {
    let malData = null;

    if (!anime.malId) {
        const results = await firstValueFrom(this.malService.searchAnime(anime.title, 1));
        if (results && results.length > 0) {
            malData = results[0];
        }
    } else {
        malData = await firstValueFrom(this.malService.getAnimeById(anime.malId));
    }

    if (malData) {
        const bannerImage = await this.malService.getBannerFromAnilist(malData.mal_id);
        
        const mediaUpdates = {
            coverImage: malData.images.webp.large_image_url || malData.images.jpg.large_image_url,
            bannerImage: bannerImage || anime.bannerImage,
            trailerUrl: malData.trailer?.embed_url || anime.trailerUrl,
            progressTotal: malData.episodes || anime.progressTotal || 0,
            genres: malData.genres?.map((g: any) => g.name) || anime.genres,
            releaseYear: malData.year || malData.aired?.prop?.from?.year || anime.releaseYear,
            externalId: malData.mal_id,
            externalApi: 'mal'
        };

        const metadataUpdates = {
            mediaItemId: anime.id!,
            studios: malData.studios?.map((s: any) => s.name) || anime.studios || [],
            malId: malData.mal_id
        };
        
        await this.animeService.updateAnime(anime.id!, mediaUpdates);
        await this.mediaService.saveAnimeMetadata(metadataUpdates);
        this.stats.update(s => ({ ...s, updated: s.updated + 1 }));
    } else {
        this.stats.update(s => ({ ...s, failed: s.failed + 1 }));
    }
  }

  private async syncGameItem(game: any) {
       // Check if game already has external ID (IGDB ID)
       // Note: getAllGames$ returns MediaItem[], so we might need to check if we have the IGDB ID stored.
       // It's in externalId column mostly.
       
       let igdbData: any = null;
       
       if (game.externalApi === 'igdb' && game.externalId) {
           igdbData = await firstValueFrom(this.igdbService.getGameById(game.externalId));
       } else {
           const results = await firstValueFrom(this.igdbService.searchGames(game.title, 1));
           if (results && results.length > 0) {
               igdbData = results[0];
           }
       }

       if (igdbData) {
            // Mapping
            // MediaItem updates
            const mediaUpdates = {
                externalId: igdbData.id,
                externalApi: 'igdb',
                coverImage: igdbData.cover?.url?.replace('t_thumb', 't_cover_big').replace(/^\/\//, 'https://') || game.coverImage,
                // Banner/Screenshot
                bannerImage: igdbData.screenshots?.[0]?.url?.replace('t_thumb', 't_screenshot_huge').replace(/^\/\//, 'https://') || game.bannerImage,
                genres: igdbData.genres?.map((g: any) => g.name) || game.genres,
                releaseYear: igdbData.first_release_date ? new Date(igdbData.first_release_date * 1000).getFullYear() : game.releaseYear,
                // Trailer could be fetched if available in IGDB data model, assuming it is from my previous check of service
                trailerUrl: igdbData.videos?.[0] ? `https://www.youtube.com/embed/${igdbData.videos[0].video_id}` : game.trailerUrl,
                notes: !game.notes ? igdbData.summary : game.notes // Only update notes if empty to avoid overwriting user notes
            };

            // Metadata updates
             const metadataUpdates = {
                mediaItemId: game.id!,
                developers: igdbData.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company.name) || [],
                publishers: igdbData.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company.name) || [],
                platforms: igdbData.platforms?.map((p: any) => p.name) || [],
                igdbId: igdbData.id
            };

            await this.gameService.updateGame(game.id!, mediaUpdates);
            await this.mediaService.saveGameMetadata(metadataUpdates);
            this.stats.update(s => ({ ...s, updated: s.updated + 1 }));
       } else {
            this.stats.update(s => ({ ...s, failed: s.failed + 1 }));
       }

    this.isProcessing.set(false);
    this.currentAnime.set('Sync Complete!');
    this.animeService.triggerFilterUpdate();
  }
}
