import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';
import { Subscription, switchMap, map, of, tap } from 'rxjs';
import { MediaItem } from '../../../../models/media-type.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';
import { MediaRunService } from '../../../../services/media-run.service';
import { GameSessionService } from '../../../../services/game-session.service';

@Component({
  selector: 'app-kanban-game-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgClass, KanbanCardComponent],
  templateUrl: './kanban-game-card.html',
  styleUrl: './kanban-game-card.scss'
})
export class KanbanGameCard implements OnInit, OnDestroy {
  private _game!: MediaItem;
  @Input() set game(value: MediaItem) {
    this._game = value;
    if (value?.id) {
      this.setupSubscription(value.id);
    }
  }
  get game(): MediaItem {
    return this._game;
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
  isCompleted = signal<boolean>(false);
  playedTime = signal<number>(0);
  private subscription?: Subscription;

  constructor(
    private runService: MediaRunService,
    private sessionService: GameSessionService
  ) {}

  ngOnInit() {
    if (this.game?.id) {
      this.setupSubscription(this.game.id);
    }
  }

  private setupSubscription(mediaId: number) {
    this.subscription?.unsubscribe();
    this.subscription = this.runService.getRunsForMedia$(mediaId).pipe(
      switchMap(runs => {
        const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
        this.isCompleted.set(!!lastRun?.endDate);
        
        if (lastRun?.id) {
          return this.sessionService.getSessionsForRun$(lastRun.id);
        }
        return of([]);
      })
    ).subscribe(sessions => {
      const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      this.playedTime.set(totalMinutes / 60);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  getScoreColorClass(score: number): string {
    return getScoreColorClass(score);
  }
}
