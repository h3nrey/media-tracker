import { Component, input, output, signal, ElementRef, computed, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check, ChevronDown } from 'lucide-angular';
import { OverlayModule, ConnectionPositionPair } from '@angular/cdk/overlay';

@Component({
  selector: 'ui-select',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, OverlayModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  encapsulation: ViewEncapsulation.None
})
export class SelectComponent {
  options = input<{ value: any, label: string }[]>([]);
  value = input<any>();
  placeholder = input<string>('Select...');
  rounding = input<'rounded' | 'full'>('rounded');
  variant = input<'default' | 'prominent'>('default');
  align = input<'left' | 'right'>('left');
  
  @Output() valueChange = new EventEmitter<any>();

  isOpen = signal(false);
  
  readonly CheckIcon = Check;
  readonly ChevronIcon = ChevronDown;

  isSelected(optValue: any): boolean {
    const current = this.value();
    if (Array.isArray(current)) {
      return current.includes(optValue);
    }
    return current === optValue;
  }

  constructor(private elementRef: ElementRef) {}

  toggle() {
    this.isOpen.update(v => !v);
  }

  selectOption(optValue: any) {
    this.valueChange.emit(optValue);
    // Only close if it's not an array (assuming array means multi-select)
    if (!Array.isArray(this.value())) {
      this.isOpen.set(false);
    }
  }

  getSelectedLabel(): string {
    const current = this.value();
    if (Array.isArray(current)) {
      if (current.length === 0) return this.placeholder();
      if (current.length === 1) {
          const selected = this.options().find(opt => opt.value === current[0]);
          return selected ? selected.label : this.placeholder();
      }
      return `${this.placeholder()} (${current.length})`;
    }

    const selected = this.options().find(opt => opt.value === current);
    return selected ? selected.label : this.placeholder();
  }

  overlayPositions = computed(() => {
    const align = this.align();
    const xDist = align === 'right' ? 'end' : 'start';
    
    const mainPos: ConnectionPositionPair = {
      originX: xDist,
      originY: 'bottom',
      overlayX: xDist,
      overlayY: 'top',
      offsetY: 8
    };

    const fallbackPos: ConnectionPositionPair = {
      originX: xDist,
      originY: 'top',
      overlayX: xDist,
      overlayY: 'bottom',
      offsetY: -8
    };

    return [mainPos, fallbackPos];
  });

  close() {
    this.isOpen.set(false);
  }
}
