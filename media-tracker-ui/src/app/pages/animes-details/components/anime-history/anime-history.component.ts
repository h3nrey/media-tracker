import { Component, input, output, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Clock, Plus, Trash2, Calendar } from 'lucide-angular';
import { formatDate } from '../../../../utils/anime-utils';
import { DatePickerComponent } from '../../../../components/ui/date-picker/date-picker.component';

import { MediaLog } from '../../../../models/media-log.model';

@Component({
  selector: 'app-anime-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePickerComponent],
  templateUrl: './anime-history.component.html',
  styleUrl: './anime-history.component.scss'
})
export class AnimeHistoryComponent {
  private el = inject(ElementRef);
  activityDates = input<any[] | undefined>([]);
  logs = input<MediaLog[] | undefined>([]);
  
  addLog = output<void>();
  removeLog = output<number>();
  updateLog = output<{ index: number, log: Partial<MediaLog> }>();

  activePicker = signal<{ index: number, field: 'startDate' | 'endDate' } | null>(null);

  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly CalendarIcon = Calendar;

  formatDate = formatDate;

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.activePicker.set(null);
    }
  }

  onAddLog() {
    this.addLog.emit();
  }

  onRemoveLog(index: number) {
    this.removeLog.emit(index);
  }

  togglePicker(index: number, field: 'startDate' | 'endDate', event?: Event) {
    if (event) {
        event.stopPropagation();
    }
    const current = this.activePicker();
    if (current && current.index === index && current.field === field) {
      this.activePicker.set(null);
    } else {
      this.activePicker.set({ index, field });
    }
  }

  handlePickerChange(index: number, field: 'startDate' | 'endDate', date: Date) {
    this.updateLog.emit({ index, log: { [field]: date } });
    this.activePicker.set(null);
  }
}
