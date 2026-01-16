import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Clock, Plus, Trash2 } from 'lucide-angular';
import { MediaLog } from '../../../../models/media-log.model';
import { DatePickerComponent } from '../../../../components/ui/date-picker/date-picker.component';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePickerComponent],
  templateUrl: './game-history.component.html',
  styleUrl: './game-history.component.scss'
})
export class GameHistoryComponent {
  logs = input<MediaLog[] | undefined>([]);
  addLog = output<void>();
  removeLog = output<number>();
  updateLog = output<{ index: number, log: Partial<MediaLog> }>();

  readonly ClockIcon = Clock;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  activePicker = signal<{ index: number, field: 'startDate' | 'endDate' } | null>(null);

  togglePicker(index: number, field: 'startDate' | 'endDate', event: MouseEvent) {
    event.stopPropagation();
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

  onAddLog() {
    this.addLog.emit();
  }

  onRemoveLog(index: number) {
    this.removeLog.emit(index);
  }
}
