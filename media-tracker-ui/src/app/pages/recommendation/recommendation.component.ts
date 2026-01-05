import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MalService } from '../../services/mal.service';
import { AnimeService } from '../../services/anime.service';
import { JikanAnime } from '../../models/mal-anime.model';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { CategoryService } from '../../services/status.service';
import { LucideAngularModule, Sparkles, Filter, RefreshCw, Plus, BookOpen, Globe, Search, Layers, X, Sword, Map, Heart, Wand2, Ghost, Zap, Coffee, Trophy, User, Music, Film, Smile, Book } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { db } from '../../services/database.service';
import { SelectComponent } from '../../components/ui/select/select';

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, SelectComponent],
  templateUrl: './recommendation.component.html',
  styleUrl: './recommendation.component.scss'
})
export class RecommendationComponent implements OnInit {
  private malService = inject(MalService);
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);

  // Icons
  readonly SparklesIcon = Sparkles;
  readonly FilterIcon = Filter;
  readonly RefreshIcon = RefreshCw;
  readonly PlusIcon = Plus;
  readonly BookIcon = BookOpen;
  readonly GlobeIcon = Globe;
  readonly SearchIcon = Search;
  readonly LayersIcon = Layers;
  readonly XIcon = X;

  // Options
  genres = signal<any[]>([]);
  categories = signal<Category[]>([]);
  decades = signal<any[]>([
    { label: '2020s', start: 2020, end: 2029 },
    { label: '2010s', start: 2010, end: 2019 },
    { label: '2000s', start: 2000, end: 2009 },
    { label: '90s',   start: 1990, end: 1999 },
    { label: '80s',   start: 1980, end: 1989 },
    { label: '70s',   start: 1970, end: 1979 },
  ]);

  eraOptions = signal<{value: any, label: string}[]>([]);
  
  // Filters
  selectedGenres = signal<number[]>([]);
  selectedDecadeValue = signal<string | null>(null);
  selectedCategory = signal<Category | null>(null);
  source = signal<'backlog' | 'jikan'>('jikan');
  
  // Result
  recommendedAnime = signal<any | null>(null);
  isLoading = signal(false);

  ngOnInit() {
    this.loadGenres();
    this.loadCategories();
    this.initializeEraOptions();
  }

  initializeEraOptions() {
    const options = this.decades().map(d => ({
      value: d.label,
      label: d.label
    }));
    this.eraOptions.set(options);
  }

  getGenreIcon(genreName: string) {
    const name = genreName.toLowerCase();
    if (name.includes('action')) return Sword;
    if (name.includes('adventure')) return Map;
    if (name.includes('comedy')) return Smile;
    if (name.includes('drama')) return Heart;
    if (name.includes('fantasy')) return Wand2;
    if (name.includes('horror')) return Ghost;
    if (name.includes('mystery') || name.includes('supernatural')) return Search;
    if (name.includes('romance')) return Heart;
    if (name.includes('sci-fi')) return Zap;
    if (name.includes('slice of life')) return Coffee;
    if (name.includes('sports')) return Trophy;
    if (name.includes('music')) return Music;
    if (name.includes('award winning')) return Trophy;
    if (name.includes('suspense')) return Search;
    return Book;
  }

  loadCategories() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
      if (cats.length > 0 && !this.selectedCategory()) {
        const ptw = cats.find(c => c.name.toLowerCase().includes('plan to watch')) || cats[0];
        this.selectedCategory.set(ptw);
      }
    });
  }

  loadGenres() {
    this.malService.getGenres().subscribe(data => {
      this.genres.set(data);
    });
  }

  getSelectedGenreObjects() {
    return this.genres().filter(g => this.selectedGenres().includes(g.mal_id));
  }

  getUnselectedGenres() {
    return this.genres().filter(g => !this.selectedGenres().includes(g.mal_id));
  }



  toggleGenre(genreId: number) {
    this.selectedGenres.update(prev => 
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    );
  }

  async getRecommendation() {
    this.isLoading.set(true);
    this.recommendedAnime.set(null);

    try {
      if (this.source() === 'backlog') {
        await this.getBacklogRecommendation();
      } else {
        await this.getJikanRecommendation();
      }
    } catch (error) {
      this.toast.error('Failed to get recommendation');
    } finally {
      this.isLoading.set(false);
    }
  }

  async getBacklogRecommendation() {
    const allAnime = await db.anime.toArray();
    let backlog = allAnime.filter(a => !a.isDeleted && a.statusId === 0);

    const decadeValue = this.selectedDecadeValue();
    if (decadeValue) {
      const decade = this.decades().find(d => d.label === decadeValue);
      if (decade) {
        const { start, end } = decade;
        backlog = backlog.filter(a => a.releaseYear && a.releaseYear >= start && a.releaseYear <= end);
      }
    }
    
    if (this.selectedGenres().length > 0) {
      const selectedGenreNames = this.genres()
        .filter(g => this.selectedGenres().includes(g.mal_id))
        .map(g => g.name);
      
      backlog = backlog.filter(a => 
        a.genres.some((genre: string) => selectedGenreNames.includes(genre))
      );
    }

    if (backlog.length === 0) {
      this.toast.info('No anime found in your backlog with these filters');
      return;
    }

    const randomIndex = Math.floor(Math.random() * backlog.length);
    this.recommendedAnime.set(backlog[randomIndex]);
  }

  async getJikanRecommendation() {
    const decadeValue = this.selectedDecadeValue();
    if (this.selectedGenres().length === 0 && !decadeValue) {
      this.malService.getRandomAnime().subscribe(anime => {
        this.recommendedAnime.set(anime);
      });
    } else {
      const decade = this.decades().find(d => d.label === decadeValue);
      this.malService.getRecommendations({
        genres: this.selectedGenres(),
        startDate: decade ? `${decade.start}-01-01` : undefined,
        endDate: decade ? `${decade.end}-12-31` : undefined
      }).subscribe(results => {
        if (results && results.length > 0) {
          const randomIndex = Math.floor(Math.random() * results.length);
          this.recommendedAnime.set(results[randomIndex]);
        } else {
          this.toast.info('No anime found with these filters');
        }
      });
    }
  }

  async addToLibrary() {
    const anime = this.recommendedAnime();
    const category = this.selectedCategory();
    if (!anime || !category) return;

    const animeToAdd = anime.mal_id ? this.malService.convertJikanToAnime(anime, category.id!) : anime;
    
    try {
      if (anime.id) {
         // It's a local anime, update its status
         await this.animeService.updateAnimeStatus(anime.id, category.id!);
         this.toast.success(`${anime.title} moved to ${category.name}!`);
      } else {
        await this.animeService.addAnime(animeToAdd);
        this.toast.success(`${animeToAdd.title} added to ${category.name}!`);
      }
    } catch (error) {
      this.toast.error('Failed to add anime');
    }
  }
}
