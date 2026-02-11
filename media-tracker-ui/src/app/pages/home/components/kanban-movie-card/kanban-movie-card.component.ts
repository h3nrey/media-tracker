import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule, Star, Clock } from 'lucide-angular';
import { Subscription, switchMap, map, of } from 'rxjs';
import { MediaItem } from '../../../../models/media-type.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';
import { MediaRunService } from '../../../../services/media-run.service';

@Component({
  selector: 'app-kanban-movie-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgClass, KanbanCardComponent],
  templateUrl: './kanban-movie-card.html',
  styleUrl: './kanban-movie-card.scss'
})
export class KanbanMovieCard implements OnInit, OnDestroy {
  private _movie!: MediaItem;
  @Input() set movie(value: MediaItem) {
    this._movie = value;
    if (value?.id) {
      this.setupSubscription(value.id);
    }
  }
  get movie(): MediaItem {
    return this._movie;
  }

  @Input() isSelected = false;
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() delete = new EventEmitter<MediaItem>();
  @Output() increment = new EventEmitter<MediaItem>();
  @Output() complete = new EventEmitter<MediaItem>();
  @Output() addNewRun = new EventEmitter<MediaItem>();
  @Output() addLog = new EventEmitter<MediaItem>();
  @Output() mediaClick = new EventEmitter<{ media: MediaItem, event: MouseEvent }>();
  
  readonly StarIcon = Star;
  readonly ClockIcon = Clock;
  
  isCompleted = signal<boolean>(false);
  private subscription?: Subscription;

  constructor(private runService: MediaRunService) {}

  ngOnInit() {
    if (this.movie?.id) {
      this.setupSubscription(this.movie.id);
    }
  }

  private setupSubscription(mediaId: number) {
    this.subscription?.unsubscribe();
    this.subscription = this.runService.getRunsForMedia$(mediaId).subscribe(runs => {
      const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
      this.isCompleted.set(!!lastRun?.endDate);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }

  formatRuntime(minutes: number): string {
    if (!minutes) return '?';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
