import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MalService } from '../../services/mal.service';
import { AnimeService } from '../../services/anime.service';
import { JikanAnime } from '../../models/mal-anime.model';
import { LucideAngularModule, TrendingUp, Star, Clock, Flame, Sparkles, ChevronRight, ChevronLeft, RefreshCw, Plus, Check, Bookmark, X } from 'lucide-angular';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { ToastService } from '../../services/toast.service';

interface AnimeSection {
  title: string;
  subtitle?: string;
  icon: any;
  items: JikanAnime[];
  isLoading: boolean;
}

interface FeaturedAnime extends JikanAnime {
  bannerImage?: string;
}

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent implements OnInit, OnDestroy {
  private malService = inject(MalService);
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Icons
  readonly TrendingIcon = TrendingUp;
  readonly StarIcon = Star;
  readonly ClockIcon = Clock;
  readonly FlameIcon = Flame;
  readonly SparklesIcon = Sparkles;
  readonly ChevronRightIcon = ChevronRight;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly RefreshIcon = RefreshCw;
  readonly PlusIcon = Plus;
  readonly CheckIcon = Check;
  readonly BookmarkIcon = Bookmark;
  readonly XIcon = X;

  sections = signal<AnimeSection[]>([
    { title: 'Trending Now', subtitle: 'Popular this season', icon: TrendingUp, items: [], isLoading: true },
    { title: 'Top Rated', subtitle: 'Highest rated of all time', icon: Star, items: [], isLoading: true },
    { title: 'Action & Adventure', subtitle: 'High-octane thrills', icon: Flame, items: [], isLoading: true },
    { title: 'Recently Added', subtitle: 'Fresh picks', icon: Clock, items: [], isLoading: true },
  ]);

  featuredAnimeList = signal<FeaturedAnime[]>([]);
  currentFeaturedIndex = signal(0);
  isLoadingFeatured = signal(true);
  private carouselInterval: any;
  isTransitioning = signal(false);

  // Categories and quick-add state
  categories = signal<Category[]>([]);
  addedAnimeIds = new Set<number>(); // Track which anime have been added
  showCategoryTooltip = signal<number | null>(null); // Track which card shows the tooltip

  get currentFeatured() {
    const list = this.featuredAnimeList();
    const index = this.currentFeaturedIndex();
    return list.length > 0 ? list[index] : null;
  }

  ngOnInit() {
    this.loadCategories();
    this.loadAllSections();
  }

  ngOnDestroy() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  loadCategories() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
    });
  }

  async quickAddAnime(anime: JikanAnime, event: Event) {
    event.stopPropagation(); // Prevent card click

    // Find Plan to Watch category (statusId: 0)
    const planToWatch = this.categories().find(c => c.id === 0) || this.categories()[0];
    
    if (!planToWatch) {
      this.toast.error('No categories available');
      return;
    }

    try {
      const animeToAdd = this.malService.convertJikanToAnime(anime, planToWatch.id!);
      await this.animeService.addAnime({...animeToAdd, mediaTypeId: 1});
      
      this.addedAnimeIds.add(anime.mal_id);
      this.toast.success(`Added to ${planToWatch.name}!`);
      
      // Show category tooltip for 5 seconds
      this.showCategoryTooltip.set(anime.mal_id);
      setTimeout(() => {
        if (this.showCategoryTooltip() === anime.mal_id) {
          this.showCategoryTooltip.set(null);
        }
      }, 5000);
    } catch (error) {
      this.toast.error('Failed to add anime');
      console.error(error);
    }
  }

  async changeAnimeCategory(anime: JikanAnime, category: Category, event: Event) {
    event.stopPropagation();

    try {
      // Find the anime in local db by MAL ID
      const localAnime = await this.animeService.getAnimeByExternalId(anime.mal_id).toPromise();
      
      if (localAnime?.id) {
        await this.animeService.updateAnimeStatus(localAnime.id, category.id!);
        this.toast.success(`Moved to ${category.name}!`);
        this.showCategoryTooltip.set(null);
      }
    } catch (error) {
      this.toast.error('Failed to update category');
      console.error(error);
    }
  }

  isAnimeAdded(malId: number): boolean {
    return this.addedAnimeIds.has(malId);
  }

  closeTooltip() {
    this.showCategoryTooltip.set(null);
  }

  async loadAllSections() {
    // Load 5 featured anime with banners
    this.malService.getRecommendations({}).subscribe(async (results) => {
      const featuredWithBanners: FeaturedAnime[] = [];
      
      for (const anime of results.slice(0, 5)) {
        const banner = await this.malService.getBannerFromAnilist(anime.mal_id);
        featuredWithBanners.push({
          ...anime,
          bannerImage: banner || undefined
        });
      }
      
      this.featuredAnimeList.set(featuredWithBanners);
      this.isLoadingFeatured.set(false);
      this.startCarousel();
    });

    // Add delays between requests to respect Jikan's rate limit
    await this.delay(1000);

    // Load trending (currently airing)
    this.malService.getRecommendations({ 
      status: 'airing'
    }).subscribe(results => {
      this.updateSection(0, results);
    });

    await this.delay(1000);

    // Load top rated - no additional filters, just sorted by score
    this.malService.getRecommendations({}).subscribe(results => {
      this.updateSection(1, results);
    });

    await this.delay(1000);

    // Load Action genre (mal_id: 1)
    this.malService.getRecommendations({ 
      genres: [1]
    }).subscribe(results => {
      this.updateSection(2, results);
    });

    await this.delay(1000);

    // Load recent anime
    this.malService.getRecommendations({ 
      startDate: '2020-01-01'
    }).subscribe(results => {
      this.updateSection(3, results);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  refreshBrowse() {
    // Clear the cache
    this.malService.clearCache();
    
    // Reset all sections to loading
    this.sections.update(sections => 
      sections.map(s => ({ ...s, items: [], isLoading: true }))
    );
    this.isLoadingFeatured.set(true);
    
    // Reload everything
    this.loadAllSections();
  }

  updateSection(index: number, items: JikanAnime[]) {
    this.sections.update(sections => {
      const updated = [...sections];
      updated[index] = { ...updated[index], items, isLoading: false };
      return updated;
    });
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.nextFeatured();
    }, 5000); // Auto-advance every 5 seconds
  }

  nextFeatured() {
    if (this.isTransitioning()) return;
    
    const list = this.featuredAnimeList();
    if (list.length > 0) {
      this.isTransitioning.set(true);
      this.currentFeaturedIndex.update(i => (i + 1) % list.length);
      
      setTimeout(() => {
        this.isTransitioning.set(false);
      }, 500); // Match CSS transition duration
    }
  }

  prevFeatured() {
    if (this.isTransitioning()) return;
    
    const list = this.featuredAnimeList();
    if (list.length > 0) {
      this.isTransitioning.set(true);
      this.currentFeaturedIndex.update(i => (i - 1 + list.length) % list.length);
      
      setTimeout(() => {
        this.isTransitioning.set(false);
      }, 500);
    }
  }

  selectFeatured(index: number) {
    if (this.isTransitioning() || this.currentFeaturedIndex() === index) return;
    
    this.isTransitioning.set(true);
    this.currentFeaturedIndex.set(index);
    
    // Reset auto-advance timer
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    }
    
    setTimeout(() => {
      this.isTransitioning.set(false);
    }, 500);
  }

  viewAnimeDetails(anime: JikanAnime) {
    // Check if anime exists in local db
    this.animeService.getAnimeByExternalId(anime.mal_id).subscribe((localAnime: any) => {
      if (localAnime) {
        this.router.navigate(['/anime', localAnime.id]);
      } else {
        // Could open a dialog or navigate to add anime flow
        console.log('Anime not in library:', anime.title);
      }
    });
  }

  scrollSection(sectionIndex: number, direction: 'left' | 'right') {
    const container = document.querySelector(`.section-${sectionIndex} .items-scroller`);
    if (container) {
      const scrollAmount = direction === 'right' ? 300 : -300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
}
