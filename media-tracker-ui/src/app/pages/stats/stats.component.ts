import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { CategoryService } from '../../services/status.service';
import { MediaItem, MediaType } from '../../models/media-type.model';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { LucideAngularModule, TrendingUp, Clock, Star, Calendar, BarChart3, Eye } from 'lucide-angular';
import { ScrollToTopComponent } from '../../components/ui/scroll-to-top/scroll-to-top.component';
import { StatsHeaderComponent } from './components/stats-header/stats-header.component';
import { StatsSummaryCardsComponent } from './components/stats-summary-cards/stats-summary-cards.component';
import { StatsDistributionComponent, CategoryStat } from './components/stats-distribution/stats-distribution.component';
import { StatsBarListComponent } from './components/stats-bar-list/stats-bar-list.component';

interface YearStats {
  totalStarted: number;
  totalCompleted: number;
  totalEpisodes: number;
  totalTime: number;
  totalAnime: number;
  avgScore: number;
  favoriteGenres: { name: string; count: number }[];
  monthlyActivity: { month: string; count: number }[];
  topRated: MediaItem[];
  recentlyCompleted: MediaItem[];
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    ScrollToTopComponent, 
    StatsHeaderComponent,
    StatsSummaryCardsComponent,
    StatsDistributionComponent,
    StatsBarListComponent
  ],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent {
  private mediaService = inject(MediaService);
  private mediaTypeState = inject(MediaTypeStateService);
  private categoryService = inject(CategoryService);

  // Icons
  readonly TrendingUpIcon = TrendingUp;
  readonly ClockIcon = Clock;
  readonly StarIcon = Star;
  readonly CalendarIcon = Calendar;
  readonly BarChartIcon = BarChart3;
  readonly EyeIcon = Eye;

  selectedYear = signal<string>('all');
  yearOptions = signal<{value: string, label: string}[]>([]);
  allMedia = signal<MediaItem[]>([]);
  categories = signal<Category[]>([]);
  currentMediaType = signal<number | null>(null);

  stats = computed(() => this.calculateStats());

  completedMediaList = computed(() => {
    const year = this.selectedYear();
    const yearNum = year === 'all' ? undefined : parseInt(year);
    return this.mediaService.getCompletedMedia(this.allMedia(), yearNum);
  });

  ngOnInit() {
    this.initializeYearOptions();
    
    // Subscribe to media type changes
    this.mediaTypeState.getSelectedMediaType$().subscribe(typeId => {
      this.currentMediaType.set(typeId);
      this.loadData(typeId);
    });

    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
    });
  }

  initializeYearOptions() {
    const currentYear = new Date().getFullYear();
    const years: {value: string, label: string}[] = [
      { value: 'all', label: 'All-Time' }
    ];
    
    for (let year = currentYear; year >= 2014; year--) {
      years.push({ value: year.toString(), label: `${year}` });
    }
    
    this.yearOptions.set(years);
  }

  loadData(mediaTypeId: number | null) {
    this.mediaService.getAllMedia$(mediaTypeId).subscribe(media => {
      this.allMedia.set(media);
    });
  }

  onYearChange(year: string) {
    this.selectedYear.set(year);
  }

  calculateStats(): YearStats {
    const year = this.selectedYear();
    const mediaType = this.currentMediaType();
    let filteredMedia = this.allMedia();

    // Use service for filtering
    if (year !== 'all') {
      filteredMedia = this.mediaService.filterMediaList(this.allMedia(), { activityYear: parseInt(year) });
    }

    // Calculate total episodes/progress watched
    const totalProgress = filteredMedia.reduce((sum, item) => 
      sum + (item.progressCurrent || 0), 0
    );

    // Calculate total time
    let totalTime = 0;
    if (mediaType === MediaType.ANIME) {
      // Assuming 24 mins per episode average for Anime
      totalTime = Math.round((totalProgress * 24) / 60);
    } else if (mediaType === MediaType.GAME) {
      // For games, progressCurrent is usually hours
      totalTime = Math.round(totalProgress);
    } else {
      // Default fallback
      totalTime = Math.round(totalProgress);
    }

    // Calculate total started (at least 1 unit of progress)
    const totalStarted = filteredMedia.filter(a => (a.progressCurrent || 0) > 0).length;

    // Calculate average score
    const scoredMedia = filteredMedia.filter(a => a.score > 0);
    const avgScore = scoredMedia.length > 0
      ? scoredMedia.reduce((sum, a) => sum + a.score, 0) / scoredMedia.length
      : 0;

    // Get completed media specifically finished in this year
    const yearNum = year === 'all' ? undefined : parseInt(year);
    const completedMedia = this.mediaService.getCompletedMedia(this.allMedia(), yearNum);
    const totalCompleted = completedMedia.length;

    // Calculate favorite genres
    const genreCount = new Map<string, number>();
    filteredMedia.forEach(item => {
      item.genres?.forEach(genre => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    });

    const favoriteGenres = Array.from(genreCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top rated
    const topRated = [...filteredMedia]
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Recently completed
    const recentlyCompleted = [...completedMedia]
      .sort((a, b) => {
        const dateA = new Date(a.endDate || 0).getTime();
        const dateB = new Date(b.endDate || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 6);

    // Monthly activity (placeholder)
    const monthlyActivity = [
      { month: 'Jan', count: Math.floor(Math.random() * 20) },
      { month: 'Feb', count: Math.floor(Math.random() * 20) },
      { month: 'Mar', count: Math.floor(Math.random() * 20) },
      { month: 'Apr', count: Math.floor(Math.random() * 20) },
      { month: 'May', count: Math.floor(Math.random() * 20) },
      { month: 'Jun', count: Math.floor(Math.random() * 20) },
      { month: 'Jul', count: Math.floor(Math.random() * 20) },
      { month: 'Aug', count: Math.floor(Math.random() * 20) },
      { month: 'Sep', count: Math.floor(Math.random() * 20) },
      { month: 'Oct', count: Math.floor(Math.random() * 20) },
      { month: 'Nov', count: Math.floor(Math.random() * 20) },
      { month: 'Dec', count: Math.floor(Math.random() * 20) }
    ];

    return {
      totalStarted,
      totalCompleted,
      totalEpisodes: totalProgress,
      totalTime,
      totalAnime: filteredMedia.length,
      avgScore: Math.round(avgScore * 10) / 10,
      favoriteGenres,
      monthlyActivity,
      topRated,
      recentlyCompleted
    };
  }

  getProducerStats() {
    const year = this.selectedYear();
    let filteredMedia = this.allMedia();

    if (year !== 'all') {
      filteredMedia = this.mediaService.filterMediaList(this.allMedia(), { activityYear: parseInt(year) });
    }

    // Count media by producer (studio/developer)
    const producerCount = new Map<string, number>();
    filteredMedia.forEach(item => {
      item.studios?.forEach(studio => {
        producerCount.set(studio, (producerCount.get(studio) || 0) + 1);
      });
    });

    return Array.from(producerCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }

  getPlatformStats() {
    const year = this.selectedYear();
    let filteredMedia = this.allMedia();

    if (year !== 'all') {
      filteredMedia = this.mediaService.filterMediaList(this.allMedia(), { activityYear: parseInt(year) });
    }

    const platformCount = new Map<string, number>();
    filteredMedia.forEach(item => {
      item.platforms?.forEach(platform => {
        platformCount.set(platform, (platformCount.get(platform) || 0) + 1);
      });
    });

    return Array.from(platformCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  getReleaseYearStats() {
    const year = this.selectedYear();
    let filteredMedia = this.allMedia();

    if (year !== 'all') {
      filteredMedia = this.mediaService.filterMediaList(this.allMedia(), { activityYear: parseInt(year) });
    }

    const releaseYearCount = new Map<number, number>();
    filteredMedia.forEach(item => {
      if (item.releaseYear) {
        releaseYearCount.set(item.releaseYear, (releaseYearCount.get(item.releaseYear) || 0) + 1);
      }
    });

    return Array.from(releaseYearCount.entries())
      .map(([name, count]) => ({ name: name.toString(), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  getAllWatchedMedia(): MediaItem[] {
    return this.completedMediaList();
  }

  getCompletionPercentage(): number {
    const completed = this.stats().totalCompleted;
    const total = this.stats().totalAnime;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  getMaxMonthlyCount(): number {
    const counts = this.stats().monthlyActivity.map(m => m.count);
    return Math.max(...counts, 1);
  }

  getCategoryStats(): CategoryStat[] {
    const year = this.selectedYear();
    let filteredMedia = this.allMedia();

    if (year !== 'all') {
      filteredMedia = this.mediaService.filterMediaList(this.allMedia(), { activityYear: parseInt(year) });
    }

    const totalCount = filteredMedia.length;

    return this.categories().map(cat => {
      const categoryMedia = filteredMedia.filter(a => a.statusId === cat.id);
      const count = categoryMedia.length;
      return {
        name: cat.name,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
        color: cat.color || this.getCategoryColor(cat.name),
        items: categoryMedia.map(m => m.title)
      };
    });
  }

  getCategoryColor(name: string): string {
    const colors: {[key: string]: string} = {
      'Completed': '#22c55e',
      'Concluído': '#22c55e',
      'Watching': '#6366f1',
      'Assistindo': '#6366f1',
      'Jogando': '#6366f1',
      'Plan to Watch': '#ec4899',
      'Planejado': '#ec4899',
      'Backlog': '#ec4899',
      'On Hold': '#eab308',
      'Em Pausa': '#eab308',
      'Dropped': '#94a3b8',
      'Dropado': '#94a3b8'
    };
    return colors[name] || '#64748b';
  }
}
