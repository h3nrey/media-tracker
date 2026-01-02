import { Component, Input,  } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule, Star } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-anime-card',
  imports: [DragDropModule, LucideAngularModule, NgClass],
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.scss',
})
export class AnimeCard {
  @Input() anime!: Anime;
  
  readonly StarIcon = Star;

  getScoreColorClass(score: number): string {
    if (score >= 1 && score <= 5) return 'score-red';
    if (score >= 6 && score <= 10) return 'score-pink';
    if (score === 11) return 'score-purple';
    return '';
  }
}
