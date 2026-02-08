import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MediaItem } from '../../../../models/media-type.model';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LucideAngularModule, Calendar, Gamepad, Zap, History } from 'lucide-angular';
import { MediaRun } from '../../../../models/media-run.model';

interface StatsDiaryData {
  days: { date: Date; count: number; media: string[]; level: number }[];
  monthHeaders: { label: string; span: number }[];
  monthsActivity: { labels: string[]; data: number[] };
  monthCovers: (string | undefined)[];
  firstPlayed: MediaItem | null;
  firstPlayedDate: Date | null;
  lastPlayed: MediaItem | null;
  lastPlayedDate: Date | null;
  totalActiveDays: number;
}

@Component({
  selector: 'app-stats-diary',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, LucideAngularModule, RouterModule],
  templateUrl: './stats-diary.component.html',
  styleUrl: './stats-diary.component.scss'
})
export class StatsDiaryComponent {
  mediaList = input.required<MediaItem[]>();
  selectedYear = input.required<string>();
  mediaType = input<number | null>(null);

  // Icons
  readonly CalendarIcon = Calendar;
  readonly GamepadIcon = Gamepad;
  readonly ZapIcon = Zap;
  readonly HistoryIcon = History;
  
  mediaLabels = computed(() => {
    const type = this.mediaType();
    if (type === 3) return { single: 'Jogo', plural: 'Jogos', verb: 'jogados', action: 'de jogo' };
    if (type === 1) return { single: 'Anime', plural: 'Animes', verb: 'assistidos', action: 'de anime' };
    if (type === 2) return { single: 'Mangá', plural: 'Mangás', verb: 'lidos', action: 'de leitura' };
    if (type === 4) return { single: 'Filme', plural: 'Filmes', verb: 'vistos', action: 'de filme' };
    return { single: 'Mídia', plural: 'Mídias', verb: 'consumidas', action: 'de consumo' };
  });

  diaryData = computed<StatsDiaryData | null>(() => {
    const list = this.mediaList();
    const yearStr = this.selectedYear();
    if (yearStr === 'all') return null;

    const year = parseInt(yearStr);
    
    // Calculate activity by day
    const activityMap = new Map<string, Set<number>>();
    const mediaIdToTitle = new Map<number, string>();
    
    list.forEach(item => {
      if (!item.id) return;
      mediaIdToTitle.set(item.id, item.title);

      if (item.activityDates) {
        item.activityDates.forEach(d => {
          const date = new Date(d);
          if (date.getFullYear() === year) {
            const key = date.toISOString().split('T')[0];
            if (!activityMap.has(key)) activityMap.set(key, new Set());
            activityMap.get(key)!.add(item.id!);
          }
        });
      }
      
      if (item.runs) {
        item.runs.forEach(run => {
          if (run.startDate) {
            const start = new Date(run.startDate);
            const end = run.endDate ? new Date(run.endDate) : start;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              if (d.getFullYear() === year) {
                const key = d.toISOString().split('T')[0];
                if (!activityMap.has(key)) activityMap.set(key, new Set());
                activityMap.get(key)!.add(item.id!);
              }
            }
          }
        });
      }
    });

    // Generate grid data for the whole year
    const days: { date: Date, count: number, media: string[], level: number }[] = [];
    const startDate = new Date(year, 0, 1);
    const firstDayOfWeek = startDate.getDay(); // 0 is Sunday
    
    // Align grid to start on Sunday of the first week of the year
    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() - firstDayOfWeek);
    
    const endDate = new Date(year, 11, 31);
    const gridEnd = new Date(endDate);
    gridEnd.setDate(gridEnd.getDate() + (6 - endDate.getDay()));

    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const current = new Date(d);
      const key = current.toISOString().split('T')[0];
      const mediaIds = activityMap.get(key);
      const mediaTitles = mediaIds ? Array.from(mediaIds).map(id => mediaIdToTitle.get(id)!) : [];
      
      let level = 0;
      if (mediaTitles.length > 0) level = 1;
      if (mediaTitles.length > 1) level = 2;
      if (mediaTitles.length > 2) level = 3;
      if (mediaTitles.length > 3) level = 4;

      // Only count days in the selected year for the color, others are always level 0
      const isOutsideYear = current.getFullYear() !== year;

      days.push({
        date: current,
        count: isOutsideYear ? 0 : mediaTitles.length,
        media: isOutsideYear ? [] : mediaTitles,
        level: isOutsideYear ? 0 : level
      });
    }

    // Month headers logic
    const monthHeaders: { label: string, span: number }[] = [];
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    let currentMonth = -1;
    let weeksInMonth = 0;
    let isCurrentMonthInYear = false;
    
    // Iterating by weeks (every 7 elements in 'days')
    for (let i = 0; i < days.length; i += 7) {
      const firstDayOfOurWeek = days[i].date;
      const month = firstDayOfOurWeek.getMonth();
      const isFromTargetYear = firstDayOfOurWeek.getFullYear() === year;
      
      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          // If this is the very first month label and it was from the previous year, we skip the text to avoid overlap
          const label = (monthHeaders.length === 0 && !isCurrentMonthInYear) ? '' : months[currentMonth];
          monthHeaders.push({ label, span: weeksInMonth });
        }
        currentMonth = month;
        weeksInMonth = 1;
        isCurrentMonthInYear = isFromTargetYear;
      } else {
        weeksInMonth++;
      }
    }
    monthHeaders.push({ label: months[currentMonth], span: weeksInMonth });

    // Games per month (count how many different games had activity in that month)
    const monthCounts = Array(12).fill(0);
    const monthMediaSets = Array.from({ length: 12 }, () => new Set<number>());
    const monthCovers = Array(12).fill(undefined);

    activityMap.forEach((mediaIds, dateKey) => {
      const date = new Date(dateKey + 'T00:00:00');
      const month = date.getMonth();
      mediaIds.forEach(id => {
        monthMediaSets[month].add(id);
        if (!monthCovers[month]) {
          const item = list.find(i => i.id === id);
          if (item?.coverImage) monthCovers[month] = item.coverImage;
        }
      });
    });
    monthMediaSets.forEach((set, i) => monthCounts[i] = set.size);

    // First and Last Played
    let firstPlayed: MediaItem | null = null;
    let lastPlayed: MediaItem | null = null;
    let minDate = Infinity;
    let maxDate = -Infinity;

    list.forEach(item => {
      const itemDates: Date[] = [];
      if (item.activityDates) item.activityDates.forEach(d => itemDates.push(new Date(d)));
      if (item.runs) {
        item.runs.forEach(run => {
          if (run.startDate) itemDates.push(new Date(run.startDate));
          if (run.endDate) itemDates.push(new Date(run.endDate));
        });
      }

      itemDates.forEach(d => {
        if (d.getFullYear() === year) {
          const time = d.getTime();
          if (time < minDate) {
            minDate = time;
            firstPlayed = item;
          }
          if (time > maxDate) {
            maxDate = time;
            lastPlayed = item;
          }
        }
      });
    });

    return {
      days,
      monthHeaders,
      monthsActivity: {
        labels: months,
        data: monthCounts
      },
      monthCovers: monthCovers,
      firstPlayed,
      firstPlayedDate: minDate === Infinity ? null : new Date(minDate),
      lastPlayed,
      lastPlayedDate: maxDate === -Infinity ? null : new Date(maxDate),
      totalActiveDays: activityMap.size
    };
  });

  chartOptions = computed(() => {
    const data = this.diaryData();
    if (!data) return null;

    return {
      series: [{
        name: 'Jogos',
        data: data.monthsActivity.data
      }],
      chart: {
        type: 'bar',
        height: 200,
        toolbar: { show: false },
        animations: { 
          enabled: true, 
          speed: 800,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 }
        },
        background: 'transparent',
        sparkline: { enabled: false }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '70%',
          distributed: true,
          dataLabels: { position: 'top' }
        }
      },
      colors: ['var(--app-primary)'], // Vibrant pink from the image
      dataLabels: {
        enabled: false // We are using covers above instead
      },
      stroke: { show: false },
      legend: { show: false },
      grid: {
        show: false,
        padding: { left: 0, right: 0, top: 0, bottom: 0 }
      },
      xaxis: {
        categories: data.monthsActivity.labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '12px',
            fontWeight: 500
          },
          offsetY: 0
        }
      },
      yaxis: { show: false },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => `${val} ${this.mediaLabels().plural.toLowerCase()} diferentes`
        }
      }
    } as any;
  });
  
  getMediaRoute(item: MediaItem | null) {
    if (!item?.id) return null;
    if (item.mediaTypeId === 3) return ['/game', item.id];
    return ['/media', item.id];
  }
}
