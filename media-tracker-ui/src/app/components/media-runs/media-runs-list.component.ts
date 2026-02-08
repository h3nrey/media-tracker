import { Component, OnInit, inject, signal, effect, input } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { switchMap, of } from 'rxjs';
import { LucideAngularModule, History, Plus, Star, ChevronDown, Trash2, PlayCircle, ClipboardList, Clock } from 'lucide-angular';
import { MediaRun } from '../../models/media-run.model';
import { MediaRunService } from '../../services/media-run.service';
import { GameSessionService } from '../../services/game-session.service';
import { ToastService } from '../../services/toast.service';
import { StarRatingInputComponent } from '../ui/star-rating-input/star-rating-input.component';
import { GameSessionsComponent } from './game-sessions/game-sessions.component';
import { EpisodeProgressComponent } from './episode-progress/episode-progress.component';
import { ChapterProgressComponent } from './chapter-progress/chapter-progress.component';
import { AddRunDialogComponent } from './add-run-dialog/add-run-dialog.component';
import { RunDetailsDialogComponent } from './run-details-dialog/run-details-dialog.component';
import { DialogService } from '../../services/dialog.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-media-runs-list',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    StarRatingInputComponent, 
    FormsModule,
    GameSessionsComponent,
    EpisodeProgressComponent,
    ChapterProgressComponent,
    AddRunDialogComponent,
    RunDetailsDialogComponent
  ],
  templateUrl: './media-runs-list.component.html',
  styleUrls: ['./media-runs-list.component.scss']
})
export class MediaRunsListComponent implements OnInit {
  mediaItemId = input.required<number>();
  mediaType = input.required<'anime' | 'game' | 'manga' | 'movie'>();
  totalCount = input<number>(0);
  
  readonly HistoryIcon = History;
  readonly PlusIcon = Plus;
  readonly StarIcon = Star;
  readonly ChevronIcon = ChevronDown;
  readonly DeleteIcon = Trash2;
  readonly PlayIcon = PlayCircle;
  readonly EmptyIcon = ClipboardList;
  readonly ClockIcon = Clock;

  public runService = inject(MediaRunService);
  private sessionService = inject(GameSessionService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  // Reactive runs list that updates automatically when mediaItemId changes or DB changes
  runs = toSignal(
    toObservable(this.mediaItemId).pipe(
      switchMap(id => id ? this.runService.getRunsForMedia$(id) : of([]))
    ), 
    { initialValue: [] }
  );

  constructor() {
    // Keep the global dialog in sync when runs are updated in the background
    effect(() => {
      const data = this.runs();
      const currentGlobalRun = this.dialogService.currentRunDetails() as MediaRun | null;
      if (currentGlobalRun) {
        const refreshed = data.find(r => r.id === (currentGlobalRun as any).id);
        if (refreshed) {
          this.dialogService.updateSelectedRun(refreshed);
        }
      }
    });
  }

  ngOnInit() {}

  async quickLogSession() {
    const allRuns = this.runs();
    if (allRuns.length === 0) return;

    const activeRun = allRuns.find(r => !r.endDate) || allRuns[allRuns.length - 1];
    if (!activeRun?.id) return;

    try {
      await this.sessionService.logSession(activeRun.id, 60);
      this.toastService.success(`Logged 1 hour session to ${this.getRunLabel(activeRun.runNumber)}`);
    } catch (error) {
      console.error('Quick log failed:', error);
      this.toastService.error('Failed to log session');
    }
  }

  openRunDetails(run: MediaRun) {
    this.dialogService.openRunDetails(run, this.mediaType(), this.totalCount());
  }

  async createNewRun() {
    this.dialogService.openAddRun(this.mediaItemId(), this.mediaType(), this.totalCount());
  }

  async deleteRun(event: Event, runId: number) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this run? All progress associated with it will be lost.')) {
      await this.runService.deleteRun(runId);
    }
  }

  async updateRating(runId: number, rating: number) {
    await this.runService.updateRun(runId, { rating });
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  }

  getRunLabel(runNumber: number): string {
    const isWatch = this.mediaType() === 'anime' || this.mediaType() === 'movie';
    const action = isWatch ? 'Watchthrough' : 'Playthrough';
    
    if (runNumber === 1) return `First ${action}`;
    if (runNumber === 2) return `Second ${action}`;
    if (runNumber === 3) return `Third ${action}`;
    if (runNumber === 4) return `Fourth ${action}`;
    if (runNumber === 5) return `Fifth ${action}`;
    return `${runNumber}th ${action}`;
  }
}

