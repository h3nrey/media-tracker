import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Filter } from 'lucide-angular';

@Component({
  selector: 'app-mobile-top-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './mobile-top-bar.component.html',
  styleUrl: './mobile-top-bar.component.scss'
})
export class MobileTopBarComponent {
  @Output() search = new EventEmitter<string>();
  @Output() filterClick = new EventEmitter<void>();
  
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  
  searchTerm = '';

  onSearchChange(value: string) {
    this.search.emit(value);
  }
}
