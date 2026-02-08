import { Component, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anime } from '../../../../models/anime.model';
import { MediaRun } from '../../../../models/media-run.model';
import { Category } from '../../../../models/status.model';
import { List } from '../../../../models/list.model';
import { AnimeLinksComponent } from '../anime-links/anime-links.component';
import { LucideAngularModule, Play, Edit3, Plus, Star, Minus, RotateCcw, CheckCheck, List as ListIcon } from 'lucide-angular';
import { SelectComponent } from '../../../../components/ui/select/select';
import { RouterModule } from '@angular/router';
import { MediaRunService } from '../../../../services/media-run.service';
import { EpisodeProgressService } from '../../../../services/episode-progress.service';

export interface AnimeDetails extends Anime {
  sourceLinks?: any[];
  runs?: MediaRun[];
}

import { MediaListSectionComponent } from '../../../../components/media-list-section/media-list-section.component';

@Component({
  selector: 'app-anime-sidebar',
  standalone: true,
  imports: [CommonModule, AnimeLinksComponent, LucideAngularModule, SelectComponent, RouterModule, MediaListSectionComponent],
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
  listUpdated = output<void>();

  private runService = inject(MediaRunService);
  private progressService = inject(EpisodeProgressService);

  activeRunEpisodeCount = signal<number>(0);
  activeRun = signal<MediaRun | null>(null);

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

  constructor() {
    effect(() => {
      const currentAnime = this.anime();
      if (currentAnime?.id) {
        this.loadActiveRun(currentAnime.id);
      }
    });

    effect(() => {
      const run = this.activeRun();
      if (run?.id) {
        const subscription = this.progressService.getEpisodesForRun$(run.id).subscribe(episodes => {
          this.activeRunEpisodeCount.set(episodes.length);
        });
        
        return () => subscription.unsubscribe();
      } else {
        this.activeRunEpisodeCount.set(0);
        return undefined;
      }
    });
  }

  async loadActiveRun(animeId: number) {
    const runs = await this.runService.getRunsForMedia(animeId);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    
    this.activeRun.set(lastRun);
  }

  get activeRunRating(): number {
    return this.activeRun()?.rating || 0;
  }

  get categoryOptions() {
    return this.categories().map(c => ({ value: c.supabaseId || c.id, label: c.name }));
  }

  get progress(): number {
    const a = this.anime();
    if (!a || !a.progressTotal) return 0;
    const current = this.activeRunEpisodeCount();
    return Math.min(100, Math.round((current / a.progressTotal) * 100));
  }

  get currentLabel(): string {
    const score = this.hoveredStar();
    return score !== null ? this.scoreLabels[score] : '';
  }

  async setScore(score: number) {
    const run = this.activeRun();
    if (run?.id) {
      this.activeRun.set({ ...run, rating: score });
      
      await this.runService.updateRun(run.id, { rating: score });
    }
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
