import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Calendar, Plus, Save } from 'lucide-angular';
import { DatePickerComponent } from '../../ui/date-picker/date-picker.component';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-add-run-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DatePickerComponent, OverlayModule],
  templateUrl: './add-run-dialog.component.html',
  styleUrl: './add-run-dialog.component.scss'
})
export class AddRunDialogComponent {
  isOpen = input<boolean>(false);
  mediaType = input<'anime' | 'game' | 'manga' | 'movie'>('anime');
  close = output<void>();
  save = output<{ startDate: Date, endDate?: Date, notes?: string }>();

  readonly XIcon = X;
  readonly CalendarIcon = Calendar;
  readonly PlusIcon = Plus;
  readonly SaveIcon = Save;

  startDate = signal<Date>(new Date());
  endDate = signal<Date | null>(null);
  notes = signal<string>('');
  
  activePicker = signal<'start' | 'end' | null>(null);

  togglePicker(field: 'start' | 'end') {
    if (this.activePicker() === field) {
      this.activePicker.set(null);
    } else {
      this.activePicker.set(field);
    }
  }

  onSave() {
    this.save.emit({
      startDate: this.startDate(),
      endDate: this.endDate() || undefined,
      notes: this.notes()
    });
    this.onClose();
  }

  onClose() {
    this.activePicker.set(null);
    this.close.emit();
  }

  updateDate(field: 'start' | 'end', date: Date) {
    if (field === 'start') {
      this.startDate.set(date);
    } else {
      this.endDate.set(date);
    }
    this.activePicker.set(null);
  }
}
