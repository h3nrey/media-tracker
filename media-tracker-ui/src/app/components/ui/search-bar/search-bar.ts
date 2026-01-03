import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X } from 'lucide-angular';

@Component({
  selector: 'ui-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBarComponent {
  @Input() query: string = '';
  @Input() placeholder: string = 'Search...';
  @Input() rounding: 'rounded' | 'full' = 'rounded';
  
  @Output() queryChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  readonly SearchIcon = Search;
  readonly XIcon = X;

  onInput(val: string) {
    this.queryChange.emit(val);
  }

  onClear() {
    this.query = '';
    this.queryChange.emit('');
    this.clear.emit();
  }
}
