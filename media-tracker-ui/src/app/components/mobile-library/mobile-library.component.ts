import { Component, OnInit, OnDestroy, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { Anime } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { MobileAnimeCardComponent } from './mobile-anime-card/mobile-anime-card.component';
import { MobileTopBarComponent } from './mobile-top-bar/mobile-top-bar.component';
import { MobileBottomNavComponent } from './mobile-bottom-nav/mobile-bottom-nav.component';
import { MobileFilterDrawerComponent } from './mobile-filter-drawer/mobile-filter-drawer.component';
import { AnimeFilterParams } from '../../services/anime.service';

@Component({
  selector: 'app-mobile-library',
  standalone: true,
  imports: [CommonModule, MobileAnimeCardComponent, MobileTopBarComponent, MobileBottomNavComponent, MobileFilterDrawerComponent, LucideAngularModule],
  templateUrl: './mobile-library.component.html',
  styleUrl: './mobile-library.component.scss'
})
export class MobileLibraryComponent implements OnInit, OnDestroy {
  @Output() animeClick = new EventEmitter<Anime>();
  @Output() editAnime = new EventEmitter<Anime>();
  @Output() addAnimeReq = new EventEmitter<number>();
  @Output() manageCategories = new EventEmitter<void>();
  @Output() manageSources = new EventEmitter<void>();
  
  readonly PlusIcon = Plus;
  categories = signal<Category[]>([]);
  allAnime = signal<Anime[]>([]);
  selectedCategoryId = signal<number | null>(null);
  
  // Filter state
  filterParams = signal<AnimeFilterParams>({
      sortOrder: 'desc',
      sortBy: 'updated'
  });
  drawerOpen = signal(false);
  
  private sub?: Subscription;

  // Base list for current category
  animeInCategory = computed(() => {
    const catId = this.selectedCategoryId();
    if (!catId) return [];
    return this.allAnime().filter(a => a.statusId === catId);
  });

  // Derived data for filters (Scoped to Category)
  availableGenres = computed(() => {
    const set = new Set<string>();
    this.animeInCategory().forEach(a => a.genres?.forEach(g => set.add(g)));
    return Array.from(set).sort();
  });

  availableStudios = computed(() => {
    const set = new Set<string>();
    this.animeInCategory().forEach(a => a.studios?.forEach(s => set.add(s)));
    return Array.from(set).sort();
  });

  availableYears = computed(() => {
    const set = new Set<number>();
    this.animeInCategory().forEach(a => {
        if(a.releaseYear) set.add(a.releaseYear);
    });
    return Array.from(set).sort((a,b) => b - a);
  });

  filteredAnime = computed(() => {
    // Apply filters to the category subset
    return this.animeService.filterAnimeList(this.animeInCategory(), this.filterParams());
  });

  constructor(
    private animeService: AnimeService,
    private categoryService: CategoryService
  ) {}

  // ... (ngOnInit etc)

  ngOnInit() {
    this.sub = combineLatest([
      this.categoryService.getAllCategories$(),
      this.animeService.getAllAnime$()
    ]).subscribe(([cats, anime]) => {
      this.categories.set(cats);
      this.allAnime.set(anime);
      
      // Select first category if none selected
      if (!this.selectedCategoryId() && cats.length > 0) {
        this.selectedCategoryId.set(cats[0].id!);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  selectCategory(id: number, event?: Event) {
    this.selectedCategoryId.set(id);
    // Scroll logic...
    if (event) {
      const btn = (event.target as HTMLElement).closest('.tab-btn') as HTMLElement;
      if (btn) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  // ... (onMoveAnime etc)
  getCount(catId: number): number {
    return this.allAnime().filter(a => a.statusId === catId).length;
  }

  async onMoveAnime(event: {anime: Anime, categoryId: number}) {
    await this.animeService.updateAnimeStatus(event.anime.id!, event.categoryId);
  }
  
  async onDeleteAnime(anime: Anime) {
    if(confirm(`Delete "${anime.title}"?`)) {
      await this.animeService.deleteAnime(anime.id!);
    }
  }

  onAddAnime() {
    if (this.selectedCategoryId()) {
      this.addAnimeReq.emit(this.selectedCategoryId()!);
    }
  }

  onSearch(query: string) {
    this.filterParams.update(p => ({ ...p, query }));
  }

  onFilter() {
    this.drawerOpen.set(true);
  }

  onUpdateFilters(params: AnimeFilterParams) {
      this.filterParams.update(current => ({...current, ...params}));
  }

  onResetFilters() {
      this.filterParams.set({
          sortOrder: 'desc',
          sortBy: 'updated',
          query: this.filterParams().query // Keep search query? Usually yes.
      });
  }
}
