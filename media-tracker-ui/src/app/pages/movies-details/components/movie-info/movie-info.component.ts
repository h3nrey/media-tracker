import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../../../models/media-type.model';
import { LucideAngularModule, ChevronLeft, Star } from 'lucide-angular';

@Component({
  selector: 'app-movie-info',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './movie-info.component.html',
  styleUrl: './movie-info.component.scss'
})
export class MovieInfoComponent {
  movie = input<MediaItem | null>(null);
  tagline = input<string>('');

  readonly ChevronLeftIcon = ChevronLeft;
  readonly StarIcon = Star;
}
