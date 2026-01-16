import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MalService } from '../../services/mal.service';
import { AnimeService } from '../../services/anime.service';
import { GameService } from '../../services/game.service';
import { IgdbService } from '../../services/igdb.service';
import { JikanAnime } from '../../models/mal-anime.model';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { CategoryService } from '../../services/status.service';
import { LucideAngularModule, Sparkles, Filter, RefreshCw, Plus, BookOpen, Globe, Search, Layers, X, Sword, Map, Heart, Wand2, Ghost, Zap, Coffee, Trophy, User, Music, Film, Smile, Book, Gamepad2, Tv, Monitor, ChevronDown } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { db } from '../../services/database.service';
import { SelectComponent } from '../../components/ui/select/select';
import { TagChipComponent } from '../../components/ui/tag-chip/tag-chip.component';
import { MediaType } from '../../models/media-type.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { MediaTypeStateService } from '../../services/media-type-state.service';

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, SelectComponent, TagChipComponent],
  templateUrl: './recommendation.component.html',
  styleUrl: './recommendation.component.scss'
})
export class RecommendationComponent implements OnInit {
  private malService = inject(MalService);
  private animeService = inject(AnimeService);
  private gameService = inject(GameService);
  private igdbService = inject(IgdbService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private mediaTypeState = inject(MediaTypeStateService);

  mediaType = toSignal(this.mediaTypeState.getSelectedMediaType$());

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
  readonly AnimeIcon = Tv;
  readonly GameIcon = Gamepad2;
  readonly MonitorIcon = Monitor;
  readonly ChevronDownIcon = ChevronDown;

  // Options
  genres = signal<any[]>([]);
  platforms = signal<any[]>([]);
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
  selectedPlatforms = signal<number[]>([]);
  selectedDecadeValue = signal<string | null>(null);
  selectedCategory = signal<Category | null>(null);
  source = signal<'backlog' | 'jikan'>('jikan');
  
  // UI State
  isGenresExpanded = signal(false);
  isPlatformsExpanded = signal(false);
  
  // Result
  recommendedAnime = signal<any | null>(null);
  isLoading = signal(false);

  ngOnInit() {
    this.loadGenres();
    this.loadCategories();
    this.initializeEraOptions();
  }

  constructor() {
    effect(() => {
      // Reload genres when media type changes
      this.mediaType();
      this.selectedGenres.set([]);
      this.selectedPlatforms.set([]);
      this.loadGenres();
      this.loadPlatforms();
    });
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

  getImageUrl(item: any): string {
    if (!item) return '';
    
    // Local MediaItem or converted item
    if (item.coverImage) return item.coverImage;

    // MAL/Jikan item
    if (item.images?.webp?.large_image_url) return item.images.webp.large_image_url;

    // IGDB item
    if (item.cover?.url) {
      const url = item.cover.url.startsWith('//') ? `https:${item.cover.url}` : item.cover.url;
      return url.replace('t_thumb', 't_cover_big');
    }

    return '';
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
    if (this.mediaType() === MediaType.ANIME) {
      this.malService.getGenres().subscribe(data => {
        this.genres.set(data);
      });
    } else {
      this.igdbService.getGenres().subscribe(data => {
        // IGDB genres are {id, name}, MAL genres are {mal_id, name}
        // Let's normalize to have mal_id or just id
        this.genres.set(data.map(g => ({ ...g, mal_id: g.id })));
      });
    }
  }

  loadPlatforms() {
    if (this.mediaType() === MediaType.GAME) {
      this.igdbService.getPlatforms().subscribe(data => {
        this.platforms.set(data);
      });
    } else {
      this.platforms.set([]);
    }
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

  togglePlatform(platformId: number) {
    this.selectedPlatforms.update(prev => 
      prev.includes(platformId) ? prev.filter(id => id !== platformId) : [...prev, platformId]
    );
  }

  async getRecommendation() {
    this.isLoading.set(true);
    this.recommendedAnime.set(null);

    const type = this.mediaType();

    try {
      if (this.source() === 'backlog') {
        await this.getBacklogRecommendation();
      } else {
         // Default to ANIME if type is null (all)
        if (type === MediaType.GAME) {
          await this.getIgdbRecommendation();
        } else {
          await this.getJikanRecommendation();
        }
      }
    } catch (error) {
      this.toast.error('Failed to get recommendation');
    } finally {
      this.isLoading.set(false);
    }
  }

  async getBacklogRecommendation() {
    const allMedia = await db.mediaItems.toArray();
    const type = this.mediaType();
    let backlog = allMedia.filter(m => !m.isDeleted && (type === null || m.mediaTypeId === type));

    const ptwCategory = this.categories().find(c => c.name.toLowerCase().includes('plan to watch'));
    if (ptwCategory) {
      backlog = backlog.filter(m => m.statusId === ptwCategory.supabaseId || m.statusId === ptwCategory.id);
    }

    const decadeValue = this.selectedDecadeValue();
    if (decadeValue) {
      const decade = this.decades().find(d => d.label === decadeValue);
      if (decade) {
        const { start, end } = decade;
        backlog = backlog.filter(m => m.releaseYear && m.releaseYear >= start && m.releaseYear <= end);
      }
    }
    
    if (this.selectedGenres().length > 0) {
      const selectedGenreNames = this.genres()
        .filter(g => this.selectedGenres().includes(g.mal_id))
        .map(g => g.name);
      
      backlog = backlog.filter(m => 
        m.genres && m.genres.some((genre: string) => selectedGenreNames.includes(genre))
      );
    }

    if (backlog.length === 0) {
      const typeLabel = type === MediaType.GAME ? 'games' : type === MediaType.ANIME ? 'anime' : 'media';
      this.toast.info(`No ${typeLabel} found in your backlog with these filters`);
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

  async getIgdbRecommendation() {
    const decadeValue = this.selectedDecadeValue();
    if (this.selectedGenres().length === 0 && this.selectedPlatforms().length === 0 && !decadeValue) {
      this.igdbService.getRandomGame().subscribe(game => {
        this.recommendedAnime.set(game);
      });
    } else {
      const decade = this.decades().find(d => d.label === decadeValue);
      this.igdbService.getRecommendations({
        genres: this.selectedGenres(),
        platforms: this.selectedPlatforms(),
        startDate: decade ? `${decade.start}-01-01` : undefined,
        endDate: decade ? `${decade.end}-12-31` : undefined
      }).subscribe(results => {
        if (results && results.length > 0) {
          const randomIndex = Math.floor(Math.random() * results.length);
          this.recommendedAnime.set(results[randomIndex]);
        } else {
          this.toast.info('No games found with these filters');
        }
      });
    }
  }

  async addToLibrary() {
    const item = this.recommendedAnime();
    const category = this.selectedCategory();
    if (!item || !category) return;

    try {
      if (item.id) {
         // It's a local item, update its status
         const itemType = item.mediaTypeId;
         if (itemType === MediaType.GAME) {
           await this.gameService.updateGame(item.id, { statusId: category.supabaseId || category.id });
         } else {
           await this.animeService.updateAnime(item.id, { statusId: category.supabaseId || category.id });
         }
         this.toast.success(`${item.title} moved to ${category.name}!`);
      } else {
        // It's from external API
        const type = this.mediaType();
        if (type === MediaType.GAME) {
          await this.gameService.addGameFromIgdb(item, category.supabaseId || category.id!);
          this.toast.success(`${item.name} added to ${category.name}!`);
        } else {
          // Default to anime if null or 1
          const animeToAdd = this.malService.convertJikanToAnime(item, category.supabaseId || category.id!);
          await this.animeService.addAnime(animeToAdd);
          this.toast.success(`${animeToAdd.title} added to ${category.name}!`);
        }
      }
    } catch (error) {
      const type = this.mediaType();
      this.toast.error(`Failed to add ${type === MediaType.GAME ? 'game' : 'anime'}`);
    }
  }
}
