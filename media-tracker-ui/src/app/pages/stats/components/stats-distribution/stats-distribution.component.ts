import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Calendar } from 'lucide-angular';
import { TooltipDirective } from '../../../../components/ui/tooltip/tooltip.directive';

export interface CategoryStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
  items?: string[];
}

@Component({
  selector: 'app-stats-distribution',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TooltipDirective],
  templateUrl: './stats-distribution.component.html',
  styleUrl: './stats-distribution.component.scss'
})
export class StatsDistributionComponent {
  title = input<string>('Distribuição por Categoria');
  stats = input.required<CategoryStat[]>();
  total = input.required<number>();
  unitLabel = input<string>('Itens');

  readonly CalendarIcon = Calendar;
}
