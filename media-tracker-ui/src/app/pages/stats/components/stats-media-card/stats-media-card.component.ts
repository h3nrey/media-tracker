import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Star } from 'lucide-angular';
import { MediaItem, MediaType } from '../../../../models/media-type.model';

@Component({
  selector: 'app-stats-media-card',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './stats-media-card.component.html',
  styleUrl: './stats-media-card.component.scss'
})
export class StatsMediaCardComponent {
  item = input.required<MediaItem>();
  showProgress = input<boolean>(false);
  showScore = input<boolean>(true);

  readonly StarIcon = Star;
  readonly MediaType = MediaType;

  detailsLink = computed(() => {
    const it = this.item();
    if (it.mediaTypeId === MediaType.GAME) {
      return ['/game', it.id];
    }
    return ['/anime', it.id];
  });

  progressText = computed(() => {
    const it = this.item();
    const current = it.progressCurrent || 0;
    if (it.mediaTypeId === MediaType.ANIME) {
      const total = it.progressTotal || '?';
      return `${current} / ${total} eps`;
    } else if (it.mediaTypeId === MediaType.GAME) {
      return `${current} hrs`;
    }
    return `${current}`;
  });
}
