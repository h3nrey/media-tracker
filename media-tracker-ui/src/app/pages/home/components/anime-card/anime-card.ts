import { Component, Input } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-anime-card',
  imports: [DragDropModule],
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.scss',
})
export class AnimeCard {
  @Input() anime!: Anime;
}
