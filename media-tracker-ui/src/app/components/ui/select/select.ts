import { Component, Input, Output, EventEmitter, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check, ChevronDown } from 'lucide-angular';

@Component({
  selector: 'ui-select',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class SelectComponent {
  @Input() options: { value: any, label: string }[] = [];
  @Input() value: any;
  @Input() placeholder: string = 'Select...';
  @Input() rounding: 'rounded' | 'full' = 'rounded';
  @Input() variant: 'default' | 'prominent' = 'default';
  @Input() align: 'left' | 'right' = 'left';
  
  @Output() valueChange = new EventEmitter<any>();

  isOpen = signal(false);
  
  readonly CheckIcon = Check;
  readonly ChevronIcon = ChevronDown;

  isSelected(optValue: any): boolean {
    if (Array.isArray(this.value)) {
      return this.value.includes(optValue);
    }
    return this.value === optValue;
  }

  constructor(private elementRef: ElementRef) {}

  toggle() {
    this.isOpen.update(v => !v);
  }

  selectOption(optValue: any) {
    this.valueChange.emit(optValue);
    // Only close if it's not an array (assuming array means multi-select)
    if (!Array.isArray(this.value)) {
      this.isOpen.set(false);
    }
  }

  getSelectedLabel(): string {
    if (Array.isArray(this.value)) {
      if (this.value.length === 0) return this.placeholder;
      if (this.value.length === 1) {
          const selected = this.options.find(opt => opt.value === this.value[0]);
          return selected ? selected.label : this.placeholder;
      }
      return `${this.placeholder} (${this.value.length})`;
    }

    const selected = this.options.find(opt => opt.value === this.value);
    return selected ? selected.label : this.placeholder;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
