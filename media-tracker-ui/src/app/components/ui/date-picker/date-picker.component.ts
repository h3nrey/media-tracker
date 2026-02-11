import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight, X } from 'lucide-angular';
import { OverlayModule, ConnectionPositionPair, CdkOverlayOrigin } from '@angular/cdk/overlay';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, OverlayModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent {
  // Overlay Inputs
  trigger = input<CdkOverlayOrigin | undefined>(undefined);
  isOpen = input<boolean>(false);
  xPosition = input<'start' | 'center' | 'end'>('start');
  yPosition = input<'top' | 'bottom'>('bottom');
  
  // Existing Inputs
  selectedDate = input<Date | string | undefined | null>(new Date());
  dateChange = output<Date>();
  close = output<void>();

  private normalizedDate = computed(() => {
    const val = this.selectedDate();
    if (!val) return new Date();
    return typeof val === 'string' ? new Date(val) : val;
  });

  viewDate = signal(new Date());

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const date = this.normalizedDate();
        this.viewDate.set(new Date(date.getTime()));
      }
    });
  }

  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly CloseIcon = X;

  daysInMonth = computed(() => {
    const date = this.viewDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month - 1,
        year: year,
        currentMonth: false
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            day: i,
            month: month,
            year: year,
            currentMonth: true
        });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({
            day: i,
            month: month + 1,
            year: year,
            currentMonth: false
        });
    }
    
    return days;
  });

  monthName = computed(() => {
    return this.viewDate().toLocaleString('default', { month: 'long' });
  });

  yearValue = computed(() => {
    return this.viewDate().getFullYear();
  });

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  years = computed(() => {
    const currentYear = new Date().getFullYear();
    const range = [];
    for (let i = currentYear - 50; i <= currentYear + 10; i++) {
      range.push(i);
    }
    return range;
  });

  showMonthPicker = signal(false);
  showYearPicker = signal(false);

  prevMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectMonth(monthIndex: number) {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), monthIndex, 1));
    this.showMonthPicker.set(false);
  }

  selectYear(year: number) {
    const d = this.viewDate();
    this.viewDate.set(new Date(year, d.getMonth(), 1));
    this.showYearPicker.set(false);
  }

  selectDay(d: any) {
    const newDate = new Date(d.year, d.month, d.day);
    this.dateChange.emit(newDate);
  }

  isToday(d: any) {
    const today = new Date();
    return d.day === today.getDate() && 
           d.month === today.getMonth() && 
           d.year === today.getFullYear();
  }

  isSelected(d: any) {
    const sel = this.normalizedDate();
    if (!sel) return false;
    return d.day === sel.getDate() && 
           d.month === sel.getMonth() && 
           d.year === sel.getFullYear();
  }

  overlayPositions = computed(() => {
    const x = this.xPosition();
    const y = this.yPosition();
    
    // Primary position
    const mainPos: ConnectionPositionPair = {
      originX: x,
      originY: y === 'top' ? 'top' : 'bottom',
      overlayX: x,
      overlayY: y === 'top' ? 'bottom' : 'top',
      offsetY: y === 'top' ? -8 : 8
    };

    // Fallback (flipped Y)
    const fallbackPos: ConnectionPositionPair = {
      originX: x,
      originY: y === 'top' ? 'bottom' : 'top',
      overlayX: x,
      overlayY: y === 'top' ? 'top' : 'bottom',
      offsetY: y === 'top' ? 8 : -8
    };

    return [mainPos, fallbackPos];
  });
}
