import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, X, Plus, ArrowRight } from 'lucide-angular';
import { MediaLog } from '../../../../../models/media-log.model';
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
  logs = input<MediaLog[]>([]);
  emptyMessage = input<string>('Track your progress here.');
  
  logsChange = output<MediaLog[]>();

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

  addLog() {
    const currentLogs = [...this.logs()];
    currentLogs.push({ mediaItemId: 0, startDate: new Date() });
    this.logsChange.emit(currentLogs);
  }

  removeLog(index: number) {
    const currentLogs = this.logs().filter((_, i) => i !== index);
    this.logsChange.emit(currentLogs);
  }

  updateLogDate(index: number, field: 'startDate' | 'endDate', date: Date | string) {
    const currentLogs = [...this.logs()];
    currentLogs[index] = { ...currentLogs[index], [field]: date };
    this.logsChange.emit(currentLogs);
    this.activeLogPicker.set(null);
  }
}
