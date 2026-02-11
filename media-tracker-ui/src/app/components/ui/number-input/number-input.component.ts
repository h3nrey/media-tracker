import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Minus, Plus } from 'lucide-angular';

@Component({
  selector: 'app-number-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './number-input.component.html',
  styleUrl: './number-input.component.scss'
})
export class NumberInputComponent {
  @Input() value: number = 0;
  @Input() placeholder?: string;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step: number = 1;
  @Output() valueChange = new EventEmitter<number>();

  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let newValue = input.value === '' ? 0 : parseInt(input.value, 10);
    
    if (isNaN(newValue)) newValue = 0;
    this.updateValue(newValue);
  }

  increment() {
    this.updateValue((this.value || 0) + this.step);
  }

  decrement() {
    this.updateValue((this.value || 0) - this.step);
  }

  private updateValue(newValue: number) {
    if (this.min !== undefined && newValue < this.min) newValue = this.min;
    if (this.max !== undefined && newValue > this.max) newValue = this.max;
    
    this.value = newValue;
    this.valueChange.emit(this.value);
  }
}
