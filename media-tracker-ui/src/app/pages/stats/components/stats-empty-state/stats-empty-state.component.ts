import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-stats-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './stats-empty-state.component.html',
  styleUrl: './stats-empty-state.component.scss'
})
export class StatsEmptyStateComponent {
  mainIcon = input.required<any>();
  subIcon = input<any>();
  title = input.required<string>();
  description = input.required<string>();
}
