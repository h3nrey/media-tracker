import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-list-view-selection-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './list-view-selection-bar.component.html',
  styleUrl: './list-view-selection-bar.component.scss'
})
export class ListViewSelectionBarComponent {
  selectedCount = input.required<number>();
  deselectAll = output<void>();

  readonly CloseIcon = X;

  onDeselectAll() {
    this.deselectAll.emit();
  }
}
