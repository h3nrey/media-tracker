import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Star, Calendar, MessageSquare, Trash2 } from 'lucide-angular';
import { MediaRun } from '../../../models/media-run.model';
import { MediaRunService } from '../../../services/media-run.service';
import { StarRatingInputComponent } from '../../ui/star-rating-input/star-rating-input.component';
import { GameSessionsComponent } from '../game-sessions/game-sessions.component';
import { EpisodeProgressComponent } from '../episode-progress/episode-progress.component';
import { ChapterProgressComponent } from '../chapter-progress/chapter-progress.component';
import { DatePickerComponent } from '../../ui/date-picker/date-picker.component';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../services/dialog.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';
import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-run-details-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    StarRatingInputComponent, 
    FormsModule,
    GameSessionsComponent,
    EpisodeProgressComponent,
    ChapterProgressComponent,
    DatePickerComponent,
    OverlayModule
  ],
  templateUrl: './run-details-dialog.component.html',
  styleUrl: './run-details-dialog.component.scss'
})
export class RunDetailsDialogComponent {
  run = input<MediaRun | null>(null);
  mediaType = input<'anime' | 'game' | 'manga' | 'movie'>('anime');
  totalCount = input<number>(0);
  
  close = output<void>();
  deleted = output<number>();
  updated = output<void>();

  readonly XIcon = X;
  readonly StarIcon = Star;
  readonly CalendarIcon = Calendar;
  readonly NotesIcon = MessageSquare;
  readonly DeleteIcon = Trash2;

  public runService = inject(MediaRunService);
  private dialogService = inject(DialogService);
  public preferencesService = inject(UserPreferencesService);

  // Date editing state
  editingStartDate = signal(false);
  editingEndDate = signal(false);
  
  // Date picker overlay triggers
  startDateTrigger = signal<CdkOverlayOrigin | undefined>(undefined);
  endDateTrigger = signal<CdkOverlayOrigin | undefined>(undefined);

  async updateRating(rating: number) {
    const currentRun = this.run();
    if (currentRun?.id) {
      // Optimistic update to UI state
      this.dialogService.updateSelectedRun({ ...currentRun, rating });
      
      await this.runService.updateRun(currentRun.id, { rating });
      this.updated.emit();
    }
  }

  async updateNotes() {
    const currentRun = this.run();
    if (currentRun?.id) {
        // Double check the notes were actually bound correctly
        this.dialogService.updateSelectedRun({ ...currentRun, notes: currentRun.notes });
        
        await this.runService.updateRun(currentRun.id, { notes: currentRun.notes });
        this.updated.emit();
    }
  }

  async deleteRun() {
    const currentRun = this.run();
    if (currentRun?.id && confirm('Are you sure you want to delete this run? All progress associated with it will be lost.')) {
      await this.runService.deleteRun(currentRun.id);
      this.deleted.emit(currentRun.id);
      this.close.emit();
    }
  }

  async updateStartDate(dateString: string) {
    const currentRun = this.run();
    if (currentRun?.id && dateString) {
      const startDate = new Date(dateString);
      this.dialogService.updateSelectedRun({ ...currentRun, startDate });
      
      await this.runService.updateRun(currentRun.id, { startDate });
      this.updated.emit();
      this.editingStartDate.set(false);
    }
  }

  async updateEndDate(dateString: string | null) {
    const currentRun = this.run();
    if (currentRun?.id) {
      const endDate = dateString ? new Date(dateString) : undefined;
      this.dialogService.updateSelectedRun({ ...currentRun, endDate });
      
      await this.runService.updateRun(currentRun.id, { endDate });
      this.updated.emit();
      this.editingEndDate.set(false);
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDateForInput(date: Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getRunLabel(runNumber: number): string {
    const isWatch = this.mediaType() === 'anime' || this.mediaType() === 'movie';
    const action = isWatch ? 'Assistido' : 'Jogada';
    
    if (runNumber === 1) return `Primeiro ${action}`;
    if (runNumber === 2) return `Segundo ${action}`;
    if (runNumber === 3) return `Terceiro ${action}`;
    if (runNumber === 4) return `Quarto ${action}`;
    if (runNumber === 5) return `Quinto ${action}`;
    return `${runNumber}º ${action}`;
  }
}
