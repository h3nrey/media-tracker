import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, RefreshCw, CheckCircle, AlertCircle, Search } from 'lucide-angular';
import { AnimeService } from '../../services/anime.service';
import { MalService } from '../../services/mal.service';
import { Anime } from '../../models/anime.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-metadata-sync-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './metadata-sync-dialog.component.html',
  styleUrl: './metadata-sync-dialog.component.scss'
})
export class MetadataSyncDialogComponent {
  private animeService = inject(AnimeService);
  private malService = inject(MalService);

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
    const allAnime = await firstValueFrom(this.animeService.getAllAnime$());
    const total = allAnime.length;
    
    this.stats.update(s => ({ ...s, total }));
    
    for (let i = 0; i < allAnime.length; i++) {
        const anime = allAnime[i];
        this.currentAnime.set(anime.title);
        this.progress.set(Math.round(((i + 1) / total) * 100));

        try {
            let malData = null;

            // 1. Get MAL ID if missing
            if (!anime.malId) {
                const results = await firstValueFrom(this.malService.searchAnime(anime.title, 1));
                if (results && results.length > 0) {
                    malData = results[0];
                }
            } else {
                // 2. Refresh details if we already have ID
                malData = await firstValueFrom(this.malService.getAnimeById(anime.malId));
            }

            if (malData) {
                const updates = {
                    malId: malData.mal_id,
                    coverImage: malData.images.webp.large_image_url || malData.images.jpg.large_image_url,
                    totalEpisodes: malData.episodes || anime.totalEpisodes || 0,
                    genres: malData.genres?.map((g: any) => g.name) || anime.genres,
                    studios: malData.studios?.map((s: any) => s.name) || anime.studios,
                    releaseYear: malData.year || malData.aired?.prop?.from?.year || anime.releaseYear,
                };
                
                await this.animeService.updateAnime(anime.id!, updates);
                this.stats.update(s => ({ ...s, updated: s.updated + 1 }));
            } else {
                this.stats.update(s => ({ ...s, failed: s.failed + 1 }));
            }

        } catch (error) {
            console.error(`Error syncing ${anime.title}:`, error);
            this.stats.update(s => ({ ...s, failed: s.failed + 1 }));
        }

        // 3. Jikan Rate Limit (1 request per second is safe)
        if (i < allAnime.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    }

    this.isProcessing.set(false);
    this.currentAnime.set('Sync Complete!');
    this.animeService.triggerFilterUpdate();
  }
}
