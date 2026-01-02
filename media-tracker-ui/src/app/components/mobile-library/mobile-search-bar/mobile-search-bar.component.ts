import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Filter } from 'lucide-angular';

@Component({
  selector: 'app-mobile-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './mobile-search-bar.component.html',
  styleUrl: './mobile-search-bar.component.scss'
})
export class MobileSearchBarComponent {
  @Output() search = new EventEmitter<string>();
  @Output() filterClick = new EventEmitter<void>();
  
  readonly SearchIcon = Search;
  readonly FilterIcon = Filter;
  
  searchTerm = '';

  onSearchChange(value: string) {
    this.search.emit(value);
  }
}
