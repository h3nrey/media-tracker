import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '../../../../models/media-type.model';
import { Category } from '../../../../models/status.model';
import { AnimeLinksComponent } from '../../../animes-details/components/anime-links/anime-links.component';
import { LucideAngularModule, Play, Edit3, Star, Monitor } from 'lucide-angular';
import { SelectComponent } from '../../../../components/ui/select/select';
import { GameDetails } from '../../game-details.model';

@Component({
  selector: 'app-game-sidebar',
  standalone: true,
  imports: [CommonModule, AnimeLinksComponent, LucideAngularModule, SelectComponent],
  templateUrl: './game-sidebar.component.html',
  styleUrl: './game-sidebar.component.scss'
})
export class GameSidebarComponent {
  game = input<GameDetails | null>(null);
  category = input<Category | null>(null);
  categories = input<Category[]>([]);
  
  edit = output<void>();
  updateScore = output<number>();
  updateCategory = output<number>();
  saveLinks = output<any[]>();

  readonly PlayIcon = Play;
  readonly EditIcon = Edit3;
  readonly StarIcon = Star;
  readonly PlatformIcon = Monitor;

  readonly scoreLabels: Record<number, string> = {
    1: 'shit',
    2: 'awful',
    3: 'meh',
    4: 'ok',
    5: 'great',
    6: 'loved'
  };

  hoveredStar = signal<number | null>(null);

  get categoryOptions() {
    return this.categories().map(c => ({ value: c.supabaseId || c.id, label: c.name }));
  }

  get currentLabel(): string {
    const score = this.hoveredStar();
    return score !== null ? this.scoreLabels[score] : '';
  }

  setScore(score: number) {
    this.updateScore.emit(score);
  }

  onHover(star: number | null) {
    this.hoveredStar.set(star);
  }

  onEdit() {
    this.edit.emit();
  }

  onSaveLinks(links: any[]) {
    this.saveLinks.emit(links);
  }

  onCategoryChange(statusId: any) {
    this.updateCategory.emit(statusId);
  }
}
