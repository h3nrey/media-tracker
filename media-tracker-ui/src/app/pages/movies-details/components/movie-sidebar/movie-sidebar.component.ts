import { Component, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '../../../../models/media-type.model';
import { MediaRun } from '../../../../models/media-run.model';
import { Category } from '../../../../models/status.model';
import { List } from '../../../../models/list.model';
import { MovieLinksComponent } from '../movie-links/movie-links.component';
import { LucideAngularModule, Play, Edit3, Plus, Star, Minus, RotateCcw, CheckCheck, List as ListIcon } from 'lucide-angular';
import { SelectComponent } from '../../../../components/ui/select/select';
import { RouterModule } from '@angular/router';
import { MediaRunService } from '../../../../services/media-run.service';
import { MediaListSectionComponent } from '../../../../components/media-list-section/media-list-section.component';

export interface MovieDetails extends MediaItem {
  sourceLinks?: any[];
  runs?: MediaRun[];
}

@Component({
  selector: 'app-movie-sidebar',
  standalone: true,
  imports: [CommonModule, MovieLinksComponent, LucideAngularModule, SelectComponent, RouterModule, MediaListSectionComponent],
  templateUrl: './movie-sidebar.component.html',
  styleUrl: './movie-sidebar.component.scss'
})
export class MovieSidebarComponent {
  movie = input<MovieDetails | null>(null);
  category = input<Category | null>(null);
  categories = input<Category[]>([]);
  lists = input<List[]>([]);
  
  edit = output<void>();
  updateScore = output<number>();
  updateCategory = output<number>();
  saveLinks = output<any[]>();
  listUpdated = output<void>();

  private runService = inject(MediaRunService);

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
      const currentMovie = this.movie();
      if (currentMovie?.id) {
        this.loadActiveRun(currentMovie.id);
      }
    });
  }

  async loadActiveRun(movieId: number) {
    const runs = await this.runService.getRunsForMedia(movieId);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    
    this.activeRun.set(lastRun);
  }

  get activeRunRating(): number {
    return this.activeRun()?.rating || 0;
  }

  get categoryOptions() {
    return this.categories().map(c => ({ value: c.supabaseId || c.id, label: c.name }));
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

  onSaveLinks(links: any[]) {
    this.saveLinks.emit(links);
  }

  onCategoryChange(statusId: any) {
    this.updateCategory.emit(statusId);
  }
}
