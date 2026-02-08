import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anime } from '../../../../models/anime.model';
import { MediaRun } from '../../../../models/media-run.model';
import { Category } from '../../../../models/status.model';
import { List } from '../../../../models/list.model';
import { AnimeLinksComponent } from '../anime-links/anime-links.component';
import { LucideAngularModule, Play, Edit3, Plus, Star, Minus, RotateCcw, CheckCheck, List as ListIcon } from 'lucide-angular';
import { SelectComponent } from '../../../../components/ui/select/select';
import { RouterModule } from '@angular/router';

export interface AnimeDetails extends Anime {
  sourceLinks?: any[];
  runs?: MediaRun[];
}

@Component({
  selector: 'app-anime-sidebar',
  standalone: true,
  imports: [CommonModule, AnimeLinksComponent, LucideAngularModule, SelectComponent, RouterModule],
  templateUrl: './anime-sidebar.component.html',
  styleUrl: './anime-sidebar.component.scss'
})
export class AnimeSidebarComponent {
  anime = input<AnimeDetails | null>(null);
  category = input<Category | null>(null);
  categories = input<Category[]>([]);
  lists = input<List[]>([]);
  
  edit = output<void>();
  incrementEpisode = output<void>();
  decrementEpisode = output<void>();
  resetEpisodes = output<void>();
  completeEpisodes = output<void>();
  updateScore = output<number>();
  updateCategory = output<number>();
  saveLinks = output<any[]>();

  readonly PlayIcon = Play;
  readonly EditIcon = Edit3;
  readonly PlusIcon = Plus;
  readonly MinusIcon = Minus;
  readonly ResetIcon = RotateCcw;
  readonly CheckIcon = CheckCheck;
  readonly StarIcon = Star;
  readonly ListIcon = ListIcon;

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

  get progress(): number {
    const a = this.anime();
    if (!a || !a.progressTotal) return 0;
    return Math.min(100, Math.round(((a.progressCurrent || 0) / a.progressTotal) * 100));
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

  onIncrementEpisode() {
    this.incrementEpisode.emit();
  }

  onDecrementEpisode() {
    this.decrementEpisode.emit();
  }

  onResetEpisodes() {
    this.resetEpisodes.emit();
  }

  onCompleteEpisodes() {
    this.completeEpisodes.emit();
  }

  onSaveLinks(links: any[]) {
    this.saveLinks.emit(links);
  }

  onCategoryChange(statusId: any) {
    this.updateCategory.emit(statusId);
  }
}
