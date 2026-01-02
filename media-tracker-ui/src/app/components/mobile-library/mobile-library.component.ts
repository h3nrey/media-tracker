import { Component, OnInit, OnDestroy, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { Anime } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { MobileAnimeCardComponent } from './mobile-anime-card/mobile-anime-card.component';

@Component({
  selector: 'app-mobile-library',
  standalone: true,
  imports: [CommonModule, MobileAnimeCardComponent, LucideAngularModule],
  templateUrl: './mobile-library.component.html',
  styleUrl: './mobile-library.component.scss'
})
export class MobileLibraryComponent implements OnInit, OnDestroy {
  @Output() animeClick = new EventEmitter<Anime>();
  @Output() editAnime = new EventEmitter<Anime>();
  @Output() addAnimeReq = new EventEmitter<number>();
  
  readonly PlusIcon = Plus;
  categories = signal<Category[]>([]);
  allAnime = signal<Anime[]>([]);
  selectedCategoryId = signal<number | null>(null);
  
  private sub?: Subscription;

  filteredAnime = computed(() => {
    const catId = this.selectedCategoryId();
    if (!catId) return [];
    return this.allAnime().filter(a => a.statusId === catId);
  });

  constructor(
    private animeService: AnimeService,
    private categoryService: CategoryService
  ) {}

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
    
    if (event) {
      const btn = (event.target as HTMLElement).closest('.tab-btn') as HTMLElement;
      if (btn) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

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
}
