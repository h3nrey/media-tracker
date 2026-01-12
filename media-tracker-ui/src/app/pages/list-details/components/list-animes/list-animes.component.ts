import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeCard } from '../../../../components/cards/anime-card/anime-card';
import { MediaItem } from '../../../../models/media-type.model';

@Component({
  selector: 'app-list-animes',
  standalone: true,
  imports: [CommonModule, AnimeCard],
  templateUrl: './list-animes.component.html',
  styleUrl: './list-animes.component.scss'
})
export class ListAnimesComponent {
  title = input<string>('Animes');
  animes = input<MediaItem[]>([]);
}
