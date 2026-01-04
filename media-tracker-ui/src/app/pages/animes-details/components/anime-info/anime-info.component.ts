import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Anime } from '../../../../models/anime.model';
import { LucideAngularModule, ChevronLeft, Star } from 'lucide-angular';

@Component({
  selector: 'app-anime-info',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './anime-info.component.html',
  styleUrl: './anime-info.component.scss'
})
export class AnimeInfoComponent {
  anime = input<Anime | null>(null);
  tagline = input<string>('');

  readonly ChevronLeftIcon = ChevronLeft;
  readonly StarIcon = Star;
}
