import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-stats.component.html',
  styleUrl: './list-stats.component.scss'
})
export class ListStatsComponent {
  percentage = input<number>(0);
  progressCurrent = input<number>(0);
  progressTotal = input<number>(0);
  itemCount = input<number>(0);
}
