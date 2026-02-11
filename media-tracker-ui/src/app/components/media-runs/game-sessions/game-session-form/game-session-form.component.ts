import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../../ui/date-picker/date-picker.component';
import { NumberInputComponent } from '../../../ui/number-input/number-input.component';
import { LucideAngularModule, Calendar, Clock, MessageSquare, Check, X } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-game-session-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DatePickerComponent, 
    NumberInputComponent, 
    LucideAngularModule, 
    OverlayModule
  ],
  templateUrl: './game-session-form.component.html',
  styleUrl: './game-session-form.component.scss'
})
export class GameSessionFormComponent {
  duration = signal<number>(60);
  playedAt = signal<Date>(new Date());
  notes = signal<string>('');
  
  isDatePickerOpen = signal(false);

  // Icons
  readonly CalendarIcon = Calendar;
  readonly ClockIcon = Clock;
  readonly NotesIcon = MessageSquare;
  readonly CheckIcon = Check;
  readonly XIcon = X;

  save = output<{ playedAt: Date; durationMinutes: number; notes: string }>();
  cancel = output<void>();

  onDateChange(date: Date) {
    this.playedAt.set(date);
    this.isDatePickerOpen.set(false);
  }

  onSave() {
    this.save.emit({
      playedAt: this.playedAt(),
      durationMinutes: this.duration(),
      notes: this.notes()
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
