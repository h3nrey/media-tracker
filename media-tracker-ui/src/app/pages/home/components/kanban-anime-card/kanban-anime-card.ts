import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';
import { Subscription, switchMap, map, of } from 'rxjs';
import { MediaItem } from '../../../../models/media-type.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';
import { MediaRunService } from '../../../../services/media-run.service';
import { EpisodeProgressService } from '../../../../services/episode-progress.service';

@Component({
  selector: 'app-kanban-anime-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgClass, KanbanCardComponent],
  templateUrl: './kanban-anime-card.html',
  styleUrl: './kanban-anime-card.scss'
})
export class KanbanAnimeCard implements OnInit, OnDestroy {
  private _anime!: MediaItem;
  @Input() set anime(value: MediaItem) {
    this._anime = value;
    if (value?.id) {
      this.setupSubscription(value.id);
    }
  }
  get anime(): MediaItem {
    return this._anime;
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
  episodeCount = signal<number>(0);
  private subscription?: Subscription;

  get isCompleted(): boolean {
    if (!this.anime || !this.anime.progressTotal) return false;
    return this.episodeCount() >= this.anime.progressTotal;
  }

  constructor(
    private runService: MediaRunService,
    private episodeProgressService: EpisodeProgressService
  ) {}

  ngOnInit() {
    if (this.anime?.id) {
      this.setupSubscription(this.anime.id);
    }
  }

  private setupSubscription(mediaId: number) {
    this.subscription?.unsubscribe();
    this.subscription = this.runService.getRunsForMedia$(mediaId).pipe(
      switchMap(runs => {
        const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
        if (lastRun?.id) {
          return this.episodeProgressService.getEpisodesForRun$(lastRun.id);
        }
        return of([]);
      })
    ).subscribe(episodes => {
      this.episodeCount.set(episodes.length);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
