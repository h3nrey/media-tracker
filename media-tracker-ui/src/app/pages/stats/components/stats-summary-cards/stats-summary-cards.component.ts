import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Eye, TrendingUp, Clock, Star } from 'lucide-angular';

@Component({
  selector: 'app-stats-summary-cards',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './stats-summary-cards.component.html',
  styleUrl: './stats-summary-cards.component.scss'
})
export class StatsSummaryCardsComponent {
  totalStarted = input.required<number>();
  totalCompleted = input.required<number>();
  totalEpisodes = input.required<number>();
  totalTime = input.required<number>();

  readonly EyeIcon = Eye;
  readonly TrendingUpIcon = TrendingUp;
  readonly ClockIcon = Clock;
  readonly StarIcon = Star;
}
