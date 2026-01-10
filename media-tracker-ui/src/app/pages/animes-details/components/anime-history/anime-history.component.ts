import { Component, input, output, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Clock, Plus, Trash2, Calendar } from 'lucide-angular';
import { formatDate } from '../../../../utils/anime-utils';
import { DatePickerComponent } from '../../../../components/ui/date-picker/date-picker.component';

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
  
  addLog = output<void>();
  removeLog = output<number>();
  updateLog = output<{ index: number, date: Date }>();

  activePickerIndex = signal<number | null>(null);

  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly CalendarIcon = Calendar;

  formatDate = formatDate;

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.activePickerIndex.set(null);
    }
  }

  onAddLog() {
    this.addLog.emit();
  }

  onRemoveLog(index: number) {
    this.removeLog.emit(index);
  }

  togglePicker(index: number, event?: Event) {
    if (event) {
        event.stopPropagation();
    }
    this.activePickerIndex.set(this.activePickerIndex() === index ? null : index);
  }

  handlePickerChange(index: number, date: Date) {
    this.updateLog.emit({ index, date });
    this.activePickerIndex.set(null);
  }
}
