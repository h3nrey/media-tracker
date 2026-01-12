import { Component, input, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem, MediaType } from '../../../models/media-type.model';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../../services/media.service';
import { LucideAngularModule, Plus } from 'lucide-angular';

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
  readonly PlusIcon = Plus;

  routePrefix = computed(() => {
    switch (this.item().mediaTypeId) {
      case MediaType.GAME: return 'game';
      case MediaType.MANGA: return 'manga';
      case MediaType.MOVIE: return 'movie';
      default: return 'anime';
    }
  });

  incrementEpisode(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const current = this.item().progressCurrent || 0;
    const total = this.item().progressTotal;

    if (!total || current < total) {
      this.mediaService.updateMedia(this.item().id!, {
        progressCurrent: current + 1
      });
    }
  }
}
