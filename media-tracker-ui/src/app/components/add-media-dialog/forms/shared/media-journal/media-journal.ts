import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, X, Plus, ArrowRight } from 'lucide-angular';
import { MediaRun } from '../../../../../models/media-run.model';
import { DatePickerComponent } from '../../../../ui/date-picker/date-picker.component';
import { OverlayModule, ConnectionPositionPair } from '@angular/cdk/overlay';

@Component({
  selector: 'app-media-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DatePickerComponent, OverlayModule],
  templateUrl: './media-journal.html',
  styleUrl: './media-journal.scss'
})
export class MediaJournalComponent {
  readonly DatePickerComponent = DatePickerComponent;
  runs = input<MediaRun[]>([]);
  emptyMessage = input<string>('Track your progress here.');
  
  runsChange = output<MediaRun[]>();

  readonly CalendarIcon = Calendar;
  readonly XIcon = X;
  readonly PlusIcon = Plus;
  readonly ArrowRightIcon = ArrowRight;

  activeLogPicker = signal<{index: number, field: 'startDate' | 'endDate'} | null>(null);
  today = new Date();

  togglePicker(index: number, field: 'startDate' | 'endDate', event: MouseEvent) {
    event.stopPropagation();
    const current = this.activeLogPicker();
    if (current?.index === index && current?.field === field) {
      this.activeLogPicker.set(null);
    } else {
      this.activeLogPicker.set({ index, field });
    }
  }

  addRun() {
    const currentRuns = [...this.runs()];
    const newRun: any = { 
      mediaItemId: 0, 
      startDate: new Date(),
      runNumber: (this.runs()?.length || 0) + 1,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    currentRuns.push(newRun as MediaRun);
    this.runsChange.emit(currentRuns);
  }

  removeRun(index: number) {
    const currentRuns = this.runs().filter((_, i) => i !== index);
    this.runsChange.emit(currentRuns);
  }

  updateRunDate(index: number, field: 'startDate' | 'endDate', date: Date | string) {
    const currentRuns = [...this.runs()];
    currentRuns[index] = { ...currentRuns[index], [field]: date };
    this.runsChange.emit(currentRuns);
    this.activeLogPicker.set(null);
  }
}
