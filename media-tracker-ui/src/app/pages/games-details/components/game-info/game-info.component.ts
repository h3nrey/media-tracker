import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ChevronLeft, Star, ChevronDown, ChevronUp } from 'lucide-angular';
import { GameDetails } from '../../game-details.model';

@Component({
  selector: 'app-game-info',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './game-info.component.html',
  styleUrl: './game-info.component.scss'
})
export class GameInfoComponent {
  game = input<GameDetails | null>(null);
  tagline = input<string>('');

  isExpanded = signal(false);

  readonly ChevronLeftIcon = ChevronLeft;
  readonly StarIcon = Star;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;

  toggleExpand() {
    this.isExpanded.update(v => !v);
  }
}
