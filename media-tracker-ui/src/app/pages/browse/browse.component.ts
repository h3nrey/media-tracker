import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MalService } from '../../services/mal.service';
import { AnimeService } from '../../services/anime.service';
import { IgdbService, IGDBGame } from '../../services/igdb.service';
import { GameService } from '../../services/game.service';
import { MediaType } from '../../models/media-type.model';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { LucideAngularModule, TrendingUp, Star, Clock, Flame, Sparkles, ChevronRight, ChevronLeft, RefreshCw, Plus, Check, Bookmark, X, Dices, ListPlus, Tv, Smile, Search } from 'lucide-angular';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { ToastService } from '../../services/toast.service';
import { MediaService } from '../../services/media.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BrowseCardComponent } from './components/browse-card/browse-card.component';
import { ListService } from '../../services/list.service';
import { List } from '../../models/list.model';
import { TrailerOverlayComponent } from './components/trailer-overlay/trailer-overlay.component';
import { Play } from 'lucide-angular';
import { SelectComponent } from '../../components/ui/select/select';
import { PopoverComponent } from '../../components/ui/popover/popover.component';
import { firstValueFrom } from 'rxjs';

export interface BrowseItem {
  externalId: number;
  title: string;
  image: string;
  bannerImage?: string;
  score?: number;
  year?: number | string;
  type?: string;
  synopsis?: string;
  genres: string[];
  rawItem: any;
  trailerUrl?: string;
}

interface BrowseSection {
  title: string;
  subtitle?: string;
  icon: any;
  items: BrowseItem[];
  isLoading: boolean;
  currentSort?: string;
  availableSorts?: { label: string, value: string }[];
}

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, BrowseCardComponent, TrailerOverlayComponent, SelectComponent, PopoverComponent],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.scss'
})
export class BrowseComponent implements OnInit, OnDestroy {
  private malService = inject(MalService);
  private igdbService = inject(IgdbService);
  private gameService = inject(GameService);
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);
  private mediaTypeState = inject(MediaTypeStateService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private mediaService = inject(MediaService);
  private listService = inject(ListService);
  private route = inject(ActivatedRoute);

  currentMediaType = signal<number>(1);
  readonly MediaType = MediaType;

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
  readonly DiceIcon = Dices;
  readonly PlayIcon = Play;
  readonly ListPlusIcon = ListPlus;
  readonly SearchIcon = Search;
  readonly TvIcon = Tv;
  readonly SmileIcon = Smile;

  private gameSortOptions = [
    { label: 'Popularidade', value: 'rating_count desc' },
    { label: 'Nota', value: 'rating desc' },
    { label: 'Lançamento', value: 'first_release_date desc' },
    { label: 'Aleatório', value: 'random' },
  ];

  private animeSortOptions = [
    { label: 'Nota', value: 'score' },
    { label: 'Popularidade', value: 'popularity' },
  ];

  sections = signal<BrowseSection[]>([
    { title: 'Melhores da Estação', subtitle: 'Populares agora', icon: TrendingUp, items: [], isLoading: true },
    { title: 'Favoritos de Sempre', subtitle: 'Notas mais altas', icon: Star, items: [], isLoading: true },
    { title: 'Muita Ação', subtitle: 'Adrenalina pura', icon: Flame, items: [], isLoading: true },
    { title: 'Recém Chegados', subtitle: 'Novidades', icon: Clock, items: [], isLoading: true },
  ]);

  featuredList = signal<BrowseItem[]>([]);
  currentFeaturedIndex = signal(0);
  isLoadingFeatured = signal(true);
  private carouselInterval: any;
  isTransitioning = signal(false);

  categories = signal<Category[]>([]);
  addedItemIds = new Set<number>();
  showCategoryTooltip = signal<number | null>(null); 
  selectedTrailer = signal<{ url: string, title: string } | null>(null);
  
  showHeroListMenu = signal(false);
  availableLists = signal<List[]>([]);
  isCreatingList = signal(false);
  newListName = '';

  // Search state
  searchQuery = signal<string>('');
  searchResults = signal<BrowseItem[]>([]);
  isSearching = signal(false);

  constructor() {
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const query = params['search'];
        const type = params['type'];
        
        if (type) {
          const typeNum = parseInt(type);
          if (typeNum !== this.currentMediaType()) {
            this.mediaTypeState.setSelectedMediaType(typeNum);
          }
        }

        if (query) {
          this.searchQuery.set(query);
          this.performSearch(query);
        } else {
          this.searchQuery.set('');
          this.searchResults.set([]);
        }
      });
    this.mediaTypeState.getSelectedMediaType$()
      .pipe(takeUntilDestroyed())
      .subscribe(type => {
        if (type) {
          this.currentMediaType.set(type);
          this.refreshBrowse();
        }
      });
  }

  get currentFeatured() {
    const list = this.featuredList();
    const index = this.currentFeaturedIndex();
    return list.length > 0 ? list[index] : null;
  }

  ngOnInit() {
    this.loadCategories();
  }

  ngOnDestroy() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  async toggleHeroListMenu(event: Event) {
    event.stopPropagation();
    if (!this.showHeroListMenu()) {
      const lists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(lists);
    }
    this.showHeroListMenu.update(v => !v);
  }

  async createAndAddListFromHero(event: Event) {
    event.stopPropagation();
    if (!this.newListName.trim()) return;

    try {
      const newListId = await this.listService.addList({
        name: this.newListName,
        mediaItemIds: [],
        animeIds: []
      });
      this.toast.success(`Lista "${this.newListName}" criada!`);
      this.newListName = '';
      this.isCreatingList.set(false);
      
      // Refresh lists
      const lists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(lists);
    } catch (error) {
      this.toast.error('Falha ao criar lista');
    }
  }

  async addToListFromHero(list: List, item: BrowseItem) {
    await this.handleAddToList({ item, list });
    this.showHeroListMenu.set(false);
  }

  private performSearch(query: string) {
    if (!query.trim()) return;
    this.isSearching.set(true);

    if (this.currentMediaType() === MediaType.GAME) {
      this.igdbService.searchGames(query).subscribe(results => {
        this.searchResults.set(results.map(g => this.normalizeGame(g)));
        this.isSearching.set(false);
      });
    } else {
      this.malService.searchAnime(query).subscribe(results => {
        this.searchResults.set(results.map(a => this.normalizeAnime(a)));
        this.isSearching.set(false);
      });
    }
  }

  loadCategories() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
    });
  }

  async quickAddMedia(item: BrowseItem, event?: Event) {
    event?.stopPropagation();

    const planToWatch = this.categories().find(c => c.supabaseId === 1) || this.categories()[0];
    
    if (!planToWatch) {
      this.toast.error('Nenhuma categoria disponível');
      return;
    }

    try {
      const addedId = await this.performQuickAdd(item);
      this.addedItemIds.add(item.externalId);
      this.toast.success(`Adicionado a ${planToWatch.name}!`);
      
      // Show category tooltip for 5 seconds
      this.showCategoryTooltip.set(item.externalId);
      setTimeout(() => {
        if (this.showCategoryTooltip() === item.externalId) {
          this.showCategoryTooltip.set(null);
        }
      }, 5000);
    } catch (error) {
      this.toast.error('Falha ao adicionar ao banco');
      console.error(error);
    }
  }

  private async performQuickAdd(item: BrowseItem): Promise<number> {
    const backlog = this.getBacklogCategory();
    if (!backlog) throw new Error('Nenhuma categoria disponível');

    const statusId = backlog.supabaseId || backlog.id!;

    if (this.currentMediaType() === MediaType.GAME) {
      return await this.gameService.addGameFromIgdb(item.rawItem, statusId);
    } else {
      const animeToAdd = this.malService.convertJikanToAnime(item.rawItem, statusId);
      return await this.animeService.addAnime({ ...animeToAdd, mediaTypeId: MediaType.ANIME });
    }
  }

  private getBacklogCategory(): Category | undefined {
    const cats = this.categories();
    if (cats.length === 0) return undefined;

    return cats.find(c => c.name.toLowerCase() === 'backlog') ||
           cats.find(c => c.name.toLowerCase().includes('backlog')) ||
           cats.find(c => c.supabaseId === 1) ||
           cats.find(c => c.name.toLowerCase().includes('plan')) ||
           cats[0];
  }

  async handleAddToList({ item, list }: { item: BrowseItem, list: List }) {
    try {
      let localId: number | undefined;

      // 1. Check if already in library (search DB directly)
      const isGame = this.currentMediaType() === MediaType.GAME;
      const apiType = isGame ? 'igdb' : 'mal';
      const local = await this.mediaService.getMediaByExternalId(item.externalId, apiType);
      
      if (local && local.id) {
        localId = local.id;
        // Also update addedItemIds to reflect it's in library
        this.addedItemIds.add(item.externalId);
      } else {
        // 2. If not in library, add it first (quietly to backlog)
        localId = await this.performQuickAdd(item);
        this.addedItemIds.add(item.externalId);
      }

      if (localId) {
        const currentIds = list.mediaItemIds || [];
        if (currentIds.includes(localId)) {
          this.toast.info('Item já está nesta lista');
          return;
        }

        await this.listService.updateList(list.id!, {
          mediaItemIds: [...currentIds, localId],
          animeIds: [...(list.animeIds || []), localId] // Legacy support
        });
        this.toast.success(`Adicionado à lista ${list.name}`);
      }
    } catch (error) {
      this.toast.error('Falha ao adicionar à lista');
      console.error(error);
    }
  }

  async changeCategory(item: BrowseItem, category: Category, event?: Event) {
    event?.stopPropagation();

    try {
      if (this.currentMediaType() === MediaType.GAME) {
        const localGame = await this.mediaService.getMediaByExternalId(item.externalId, 'igdb');
        if (localGame?.id) {
          await this.mediaService.updateMediaStatus(localGame.id, category.supabaseId!);
          this.toast.success(`Movido para ${category.name}!`);
        }
      } else {
        const localAnime = await this.mediaService.getMediaByExternalId(item.externalId, 'mal');
        if (localAnime?.id) {
          await this.mediaService.updateMediaStatus(localAnime.id, category.supabaseId!);
          this.toast.success(`Movido para ${category.name}!`);
        }
      }
      this.showCategoryTooltip.set(null);
    } catch (error) {
      this.toast.error('Falha ao atualizar categoria');
      console.error(error);
    }
  }

  isItemAdded(externalId: number): boolean {
    return this.addedItemIds.has(externalId);
  }

  closeTooltip() {
    this.showCategoryTooltip.set(null);
  }

  async loadAllSections() {
    const cacheKey = `browse_sections_${this.currentMediaType()}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { sections, featured, timestamp } = JSON.parse(cached);
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000;

        if (now - timestamp < twoHours) {
          console.log('Using cached browse data');
          this.sections.set(sections);
          this.featuredList.set(featured);
          this.isLoadingFeatured.set(false);
          this.startCarousel();
          return;
        }
      } catch (e) {
        console.error('Failed to parse browse cache', e);
      }
    }

    if (this.currentMediaType() === MediaType.GAME) {
      this.loadGameSections();
    } else {
      this.loadAnimeSections();
    }
  }

  private saveToCache() {
    const cacheKey = `browse_sections_${this.currentMediaType()}`;
    const data = {
      sections: this.sections(),
      featured: this.featuredList(),
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }

  changeSectionSort(index: number, newSort: string) {
    this.sections.update(sections => {
      const updated = [...sections];
      updated[index] = { ...updated[index], currentSort: newSort, isLoading: true, items: [] };
      return updated;
    });

    if (this.currentMediaType() === MediaType.GAME) {
      this.reloadGameSection(index, newSort);
    } else {
      // Anime Jikan API is more fixed, but we can try to re-fetch if applicable
      this.loadAnimeSections(); // For now just reload all for simplicity
    }
  }

  private reloadGameSection(index: number, sort: string) {
    const section = this.sections()[index];
    const globalExclusions = {
      excludeGameModes: [5],
      excludeCollections: [1]
    };

    let params: any = { 
      limit: 20, 
      ...globalExclusions 
    };

    if (sort === 'random') {
      params.offset = Math.floor(Math.random() * 200);
      params.sort = 'rating desc';
    } else {
      params.sort = sort;
    }

    // Apply specific logic based on section index if needed
    if (index === 2) params.platforms = [24]; // GBA
    if (index === 3) params.platforms = [8];  // PS2
    if (index === 4) params.platforms = [19]; // sNES
    if (index === 5) params.genres = [32];    // Indies

    this.igdbService.getRecommendations(params).subscribe(results => {
      this.updateSection(index, results.map(g => this.normalizeGame(g)));
    });
  }

  private async loadAnimeSections() {
    // Initial sections setup for anime - keep them in loading state
    this.sections.set([
      { title: 'Mais Populares', subtitle: 'Favoritos da comunidade', icon: TrendingUp, items: [], isLoading: true },
      { title: 'Novos Lançamentos', subtitle: 'Estreias recentes', icon: Clock, items: [], isLoading: true },
      { title: 'Anos 2000', subtitle: 'Clássicos dessa década', icon: Tv, items: [], isLoading: true },
      { title: 'Nostalgia anos 90', subtitle: 'Onde tudo começou', icon: Sparkles, items: [], isLoading: true },
      { title: 'Pura Diversão', subtitle: 'As melhores comédias', icon: Smile, items: [], isLoading: true },
    ]);
    this.isLoadingFeatured.set(true);

    try {
      // 1. Fetch Featured (Home)
      const featuredResults = await firstValueFrom(this.malService.getRecommendations({}));
      const featured: BrowseItem[] = [];
      for (const anime of featuredResults.slice(0, 5)) {
        // Banner fetching also respects internal delays
        const banner = await this.malService.getBannerFromAnilist(anime.mal_id);
        featured.push(this.normalizeAnime(anime, banner || undefined));
      }

      // 2. Fetch Sections Sequentially to respect Jikan's 1 req/sec limit
      // Each call inside MalService already has a delay(1000) logic
      const s0 = await firstValueFrom(this.malService.getRecommendations({}));
      const s1 = await firstValueFrom(this.malService.getRecommendations({ status: 'airing' }));
      const s2 = await firstValueFrom(this.malService.getRecommendations({ startDate: '2000-01-01', endDate: '2009-12-31' }));
      const s3 = await firstValueFrom(this.malService.getRecommendations({ startDate: '1990-01-01', endDate: '1999-12-31' }));
      const s4 = await firstValueFrom(this.malService.getRecommendations({ genres: [4] }));

      // 3. Update all UI at once
      this.featuredList.set(featured);
      this.isLoadingFeatured.set(false);
      this.startCarousel();

      this.sections.update(sections => {
        const updated = [...sections];
        if (updated.length >= 5) {
          updated[0] = { ...updated[0], items: s0.map(a => this.normalizeAnime(a)), isLoading: false };
          updated[1] = { ...updated[1], items: s1.map(a => this.normalizeAnime(a)), isLoading: false };
          updated[2] = { ...updated[2], items: s2.map(a => this.normalizeAnime(a)), isLoading: false };
          updated[3] = { ...updated[3], items: s3.map(a => this.normalizeAnime(a)), isLoading: false };
          updated[4] = { ...updated[4], items: s4.map(a => this.normalizeAnime(a)), isLoading: false };
        }
        return updated;
      });

      // 4. Save the full state to cache
      this.saveToCache();
      
    } catch (error) {
      console.error('Failed to load anime sections sequentially:', error);
      this.toast.error('Erro ao carregar recomendações de anime');
      // Reset loading state on error
      this.sections.update(sections => sections.map(s => ({ ...s, isLoading: false })));
      this.isLoadingFeatured.set(false);
    }
  }
  private loadGameSections() {
    // Initial sections setup for games
    this.sections.set([
      { title: 'Jogos Populares', icon: TrendingUp, items: [], isLoading: true, currentSort: 'rating_count desc', availableSorts: this.gameSortOptions },
      { title: 'Novos Lançamentos', icon: Clock, items: [], isLoading: true, currentSort: 'first_release_date desc', availableSorts: this.gameSortOptions },
      { title: 'Game Boy Advance', icon: Flame, items: [], isLoading: true, currentSort: 'random', availableSorts: this.gameSortOptions },
      { title: 'PlayStation 2', icon: Star, items: [], isLoading: true, currentSort: 'random', availableSorts: this.gameSortOptions },
      { title: 'Super Nintendo', icon: Sparkles, items: [], isLoading: true, currentSort: 'random', availableSorts: this.gameSortOptions },
      { title: 'Indies de Ouro', icon: this.PlusIcon, items: [], isLoading: true, currentSort: 'random', availableSorts: this.gameSortOptions },
    ]);

    // Fetch initial data
    this.sections().forEach((_, i) => this.reloadGameSection(i, this.sections()[i].currentSort!));

    // Featured Games
    this.igdbService.getRecommendations({ sort: 'rating desc', limit: 5 }).subscribe(results => {
      this.featuredList.set(results.map(g => this.normalizeGame(g)));
      this.isLoadingFeatured.set(false);
      this.startCarousel();
    });
  }

  private normalizeAnime(anime: any, bannerImage?: string): BrowseItem {
    return {
      externalId: anime.mal_id,
      title: anime.title_english || anime.title,
      image: anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
      bannerImage: bannerImage || anime.bannerImage,
      score: anime.score,
      year: anime.year,
      type: anime.type,
      synopsis: anime.synopsis,
      genres: anime.genres?.map((g: any) => g.name) || [],
      rawItem: anime,
      trailerUrl: anime.trailer?.embed_url
    };
  }

  private normalizeGame(game: IGDBGame): BrowseItem {
    const getCoverUrl = (url?: string) => {
      if (!url) return '';
      const fullUrl = url.startsWith('//') ? `https:${url}` : url;
      return fullUrl.replace('t_thumb', 't_cover_big');
    };

    const getBannerUrl = (game: IGDBGame) => {
      if (game.screenshots && game.screenshots.length > 0) {
        const url = game.screenshots[0].url;
        return (url.startsWith('//') ? `https:${url}` : url).replace('t_thumb', 't_screenshot_huge');
      }
      return '';
    };

    const getTrailerUrl = (game: IGDBGame) => {
      if (game.videos && game.videos.length > 0) {
        return `https://www.youtube.com/embed/${game.videos[0].video_id}`;
      }
      return '';
    };

    return {
      externalId: game.id,
      title: game.name,
      image: getCoverUrl(game.cover?.url),
      bannerImage: getBannerUrl(game),
      trailerUrl: getTrailerUrl(game),
      score: game.first_release_date ? undefined : undefined, // IGDB returns rating, but we need to map it if we want it here
      year: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined,
      type: 'Game',
      synopsis: game.summary,
      genres: game.genres?.map(g => g.name) || [],
      rawItem: game
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  refreshBrowse() {
    // Clear the cache
    this.malService.clearCache();
    localStorage.removeItem(`browse_sections_${this.currentMediaType()}`);
    
    // Reset all sections to loading
    this.sections.update(sections => 
      sections.map(s => ({ ...s, items: [], isLoading: true }))
    );
    this.isLoadingFeatured.set(true);
    
    // Reload everything
    this.loadAllSections();
  }

  updateSection(index: number, items: BrowseItem[]) {
    this.sections.update(sections => {
      const updated = [...sections];
      updated[index] = { ...updated[index], items, isLoading: false };
      return updated;
    });

    // If all sections are done loading, save to cache
    if (this.sections().every(s => !s.isLoading) && !this.isLoadingFeatured()) {
      this.saveToCache();
    }
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.nextFeatured();
    }, 5000); // Auto-advance every 5 seconds
  }

  nextFeatured() {
    if (this.isTransitioning()) return;
    
    const list = this.featuredList();
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

    const list = this.featuredList();
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

  async viewDetails(item: BrowseItem) {
    if (this.currentMediaType() === MediaType.GAME) {
      const localGame = await this.mediaService.getMediaByExternalId(item.externalId, 'igdb');
      if (localGame) {
        this.router.navigate(['/game', localGame.id]);
      }
    } else {
      const localAnime = await this.mediaService.getMediaByExternalId(item.externalId, 'mal');
      if (localAnime) {
        this.router.navigate(['/anime', localAnime.id]);
      }
    }
  }

  scrollSection(sectionIndex: number, direction: 'left' | 'right') {
    const container = document.querySelector(`.section-${sectionIndex} .items-scroller`);
    if (container) {
      const scrollAmount = direction === 'right' ? 300 : -300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  playTrailer(item: BrowseItem) {
    if (item.trailerUrl) {
      this.selectedTrailer.set({
        url: item.trailerUrl,
        title: item.title
      });
    } else {
      this.toast.info('Trailer não disponível para este item');
    }
  }
}
