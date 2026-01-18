import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Crown, Trophy, Medal } from 'lucide-angular';
import { MediaItem } from '../../../../models/media-type.model';
import { StatsMediaCardComponent } from '../stats-media-card/stats-media-card.component';
import { StatsEmptyStateComponent } from '../stats-empty-state/stats-empty-state.component';

@Component({
  selector: 'app-stats-podium',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, StatsMediaCardComponent, StatsEmptyStateComponent],
  templateUrl: './stats-podium.component.html',
  styleUrl: './stats-podium.component.scss'
})
export class StatsPodiumComponent {
  items = input.required<MediaItem[]>();
  title = input<string>('Meus Bodes');

  readonly CrownIcon = Crown;
  readonly TrophyIcon = Trophy;
  readonly MedalIcon = Medal;

  podiumItems = computed(() => {
    const all = this.items();
    return {
      first: all[0] || null,
      second: all[1] || null,
      third: all[2] || null,
      others: all.slice(3)
    };
  });
}
