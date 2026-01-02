import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Calendar, Star, PlayCircle, Tag, FileText } from 'lucide-angular';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-anime-details-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './anime-details-dialog.component.html',
  styleUrl: './anime-details-dialog.component.scss'
})
export class AnimeDetailsDialogComponent {
  isOpen = signal(false);
  anime = signal<Anime | null>(null);

  // Lucide icons
  readonly XIcon = X;
  readonly CalendarIcon = Calendar;
  readonly StarIcon = Star;
  readonly PlayCircleIcon = PlayCircle;
  readonly TagIcon = Tag;
  readonly FileTextIcon = FileText;

  open(anime: Anime) {
    this.anime.set(anime);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.anime.set(null);
  }

  getScoreColorClass(score: number): string {
    if (score >= 1 && score <= 5) return 'score-red';
    if (score >= 6 && score <= 10) return 'score-pink';
    if (score === 11) return 'score-purple';
    return '';
  }
}
