import { Component, input, inject, computed, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem, MediaType } from '../../../models/media-type.model';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../../services/media.service';
import { MediaRunService } from '../../../services/media-run.service';
import { EpisodeProgressService } from '../../../services/episode-progress.service';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, map, of } from 'rxjs';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [RouterLink, CommonModule, LucideAngularModule],
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.scss',
})
export class AnimeCard {
  item = input.required<MediaItem>();
  private mediaService = inject(MediaService);
  private runService = inject(MediaRunService);
  private episodeService = inject(EpisodeProgressService);

  readonly PlusIcon = Plus;

  runProgress = signal<number>(0);

  constructor() {
    toObservable(this.item).pipe(
      switchMap(item => {
        if (!item?.id) return of(0);
        // For anime/manga, we want the count from the last run
        return this.runService.getRunsForMedia$(item.id).pipe(
          switchMap(runs => {
            const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
            if (!lastRun?.id) return of(item.progressCurrent || 0);

            if (item.mediaTypeId === MediaType.ANIME) {
              return this.episodeService.getEpisodesForRun$(lastRun.id).pipe(map(e => e.length));
            }
            // For games or others, we might just stick to progressCurrent or sum sessions
            // For now, let's keep it simple for series
            return of(item.progressCurrent || 0);
          })
        );
      })
    ).subscribe(progress => {
      this.runProgress.set(progress);
    });
  }

  routePrefix = computed(() => {
    switch (this.item().mediaTypeId) {
      case MediaType.GAME: return 'game';
      case MediaType.MANGA: return 'manga';
      case MediaType.MOVIE: return 'movie';
      default: return 'anime';
    }
  });

  async incrementEpisode(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const media = this.item();
    const current = this.runProgress();
    const total = media.progressTotal;

    if (!total || current < total) {
      // 1. Update run progress (which is more accurate)
      const runs = await this.runService.getRunsForMedia(media.id!);
      const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;

      if (lastRun?.id) {
        if (media.mediaTypeId === MediaType.ANIME) {
          await this.episodeService.markNextEpisodeWatched(lastRun.id);
        } else {
          // Legacy/Fallback
          await this.mediaService.updateMedia(media.id!, {
            progressCurrent: current + 1
          });
        }
      } else {
        // No run? Update media directly
        await this.mediaService.updateMedia(media.id!, {
          progressCurrent: current + 1
        });
      }
    }
  }
}
