import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';

export interface BarStat {
  name: string;
  count: number;
}

@Component({
  selector: 'app-stats-bar-list',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './stats-bar-list.component.html',
  styleUrl: './stats-bar-list.component.scss'
})
export class StatsBarListComponent {
  title = input.required<string>();
  data = input.required<BarStat[]>();
  color = input<string>('var(--app-primary)'); // Base color if needed

  chartOptions = computed(() => {
    const stats = this.data();
    const baseColor = this.color();
    
    return {
      series: stats.map(s => s.count),
      labels: stats.map(s => s.name),
      chart: {
        type: 'donut' as const,
        height: 380,
        background: 'transparent',
        foreColor: 'var(--app-text-primary)',
        animations: {
          enabled: true,
          easing: 'easeinout' as const,
          speed: 800
        }
      },
      // Using CSS variables so we can use color-mix reliably in SCSS
      colors: ['var(--chart-color-main)', 'var(--chart-color-dark)'],
      stroke: {
        show: false
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        position: 'bottom' as const,
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        labels: {
          colors: 'var(--app-text-primary)'
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5
        }
      },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: baseColor,
                offsetY: -5
              },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--app-text-primary)',
                offsetY: 5,
                formatter: (val: string) => val
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: '14px',
                fontWeight: 600,
                color: baseColor,
                formatter: (w: any) => {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
                }
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'dark'
      }
    };
  });
}
