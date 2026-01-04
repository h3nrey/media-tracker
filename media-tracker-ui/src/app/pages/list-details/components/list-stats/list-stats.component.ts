import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-stats.component.html',
  styleUrl: './list-stats.component.scss'
})
export class ListStatsComponent {
  percentage = input<number>(0);
  watchedEpisodes = input<number>(0);
  totalEpisodes = input<number>(0);
  animeCount = input<number>(0);
}
