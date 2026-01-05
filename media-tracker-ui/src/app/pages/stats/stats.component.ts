import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { LucideAngularModule, TrendingUp, Clock, Star, Calendar, BarChart3, Eye } from 'lucide-angular';
import { SelectComponent } from '../../components/ui/select/select';

interface YearStats {
  totalAnime: number;
  totalEpisodes: number;
  avgScore: number;
  totalCompleted: number;
  favoriteGenres: { name: string; count: number }[];
  monthlyActivity: { month: string; count: number }[];
  topRated: Anime[];
  recentlyCompleted: Anime[];
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SelectComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent {
  private animeService = inject(AnimeService);
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
  allAnime = signal<Anime[]>([]);
  categories = signal<Category[]>([]);

  stats = computed(() => this.calculateStats());

  ngOnInit() {
    this.initializeYearOptions();
    this.loadData();
  }

  initializeYearOptions() {
    const currentYear = new Date().getFullYear();
    const years: {value: string, label: string}[] = [
      { value: 'all', label: 'All-Time Stats' }
    ];
    
    for (let year = currentYear; year >= 2000; year--) {
      years.push({ value: year.toString(), label: `${year} Recap` });
    }
    
    this.yearOptions.set(years);
  }

  loadData() {
    this.animeService.getAllAnime$().subscribe(anime => {
      this.allAnime.set(anime);
    });

    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
    });
  }

  onYearChange(year: string) {
    this.selectedYear.set(year);
  }

  calculateStats(): YearStats {
    const year = this.selectedYear();
    let filteredAnime = this.allAnime();

    // Filter by year if not "all"
    if (year !== 'all') {
      const yearNum = parseInt(year);
      filteredAnime = filteredAnime.filter(anime => {
        // Filter by release year or year added to library
        return anime.releaseYear === yearNum;
      });
    }

    // Calculate total episodes watched
    const totalEpisodes = filteredAnime.reduce((sum, anime) => 
      sum + (anime.episodesWatched || 0), 0
    );

    // Calculate average score
    const scoredAnime = filteredAnime.filter(a => a.score > 0);
    const avgScore = scoredAnime.length > 0
      ? scoredAnime.reduce((sum, a) => sum + a.score, 0) / scoredAnime.length
      : 0;

    // Get completed category
    const completedCategory = this.categories().find(c => c.name === 'Completed');
    const totalCompleted = completedCategory 
      ? filteredAnime.filter(a => a.statusId === completedCategory.id).length
      : 0;

    // Calculate favorite genres
    const genreCount = new Map<string, number>();
    filteredAnime.forEach(anime => {
      anime.genres?.forEach(genre => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    });

    const favoriteGenres = Array.from(genreCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top rated
    const topRated = [...filteredAnime]
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Recently completed
    const recentlyCompleted = completedCategory
      ? [...filteredAnime]
          .filter(a => a.statusId === completedCategory.id)
          .slice(0, 6)
      : [];

    // Monthly activity (placeholder - would need dates in anime model)
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
      totalAnime: filteredAnime.length,
      totalEpisodes,
      avgScore: Math.round(avgScore * 10) / 10,
      totalCompleted,
      favoriteGenres,
      monthlyActivity,
      topRated,
      recentlyCompleted
    };
  }

  getStudioStats() {
    const year = this.selectedYear();
    let filteredAnime = this.allAnime();

    if (year !== 'all') {
      const yearNum = parseInt(year);
      filteredAnime = filteredAnime.filter(a => a.releaseYear === yearNum);
    }

    // Count anime by studio
    const studioCount = new Map<string, number>();
    filteredAnime.forEach(anime => {
      anime.studios?.forEach(studio => {
        studioCount.set(studio, (studioCount.get(studio) || 0) + 1);
      });
    });

    return Array.from(studioCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }

  getAllWatchedAnime(): Anime[] {
    const year = this.selectedYear();
    let filteredAnime = this.allAnime();

    if (year !== 'all') {
      const yearNum = parseInt(year);
      filteredAnime = filteredAnime.filter(a => a.releaseYear === yearNum);
    }

    // Return all anime with at least 1 episode watched, sorted by episodes watched
    return filteredAnime
      .filter(a => (a.episodesWatched || 0) > 0)
      .sort((a, b) => (b.episodesWatched || 0) - (a.episodesWatched || 0));
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

  getCategoryStats() {
    const year = this.selectedYear();
    let filteredAnime = this.allAnime();

    if (year !== 'all') {
      const yearNum = parseInt(year);
      filteredAnime = filteredAnime.filter(a => a.releaseYear === yearNum);
    }

    return this.categories().map(cat => ({
      name: cat.name,
      count: filteredAnime.filter(a => a.statusId === cat.id).length,
      color: this.getCategoryColor(cat.name)
    }));
  }

  getCategoryColor(name: string): string {
    const colors: {[key: string]: string} = {
      'Completed': '#64f65c',
      'Watching': '#3b82f6',
      'Plan to Watch': '#a855f7',
      'On Hold': '#f59e0b',
      'Dropped': '#ef4444'
    };
    return colors[name] || '#8b949e';
  }
}
