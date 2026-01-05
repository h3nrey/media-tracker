import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { LucideAngularModule, Plus, ChevronDown, ChevronUp } from 'lucide-angular';
import { SelectComponent } from '../ui/select/select';

@Component({
  selector: 'app-list-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SelectComponent],
  templateUrl: './list-view.component.html',
  styleUrl: './list-view.component.scss'
})
export class ListViewComponent {
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);

  @Output() animeClick = new EventEmitter<Anime>();
  @Output() editAnime = new EventEmitter<Anime>();
  @Output() addAnimeToCategory = new EventEmitter<number>();

  readonly PlusIcon = Plus;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;

  categories = signal<Category[]>([]);
  animeByCategory = signal<Map<number, Anime[]>>(new Map());
  collapsedSections = new Set<number>(); // Track collapsed categories
  
  // Year filter
  selectedYear = signal<string>('all');
  yearOptions = signal<{value: string, label: string}[]>([]);

  ngOnInit() {
    this.loadData();
    this.initializeYearOptions();
  }

  initializeYearOptions() {
    const currentYear = new Date().getFullYear();
    const years: {value: string, label: string}[] = [
      { value: 'all', label: 'All Time' }
    ];
    
    // Add years from current back to 1960
    for (let year = currentYear; year >= 1960; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    
    this.yearOptions.set(years);
  }

  loadData() {
    this.categoryService.getAllCategories$().subscribe(categories => {
      this.categories.set(categories);
      
      // Load anime for each category
      const animeMap = new Map<number, Anime[]>();
      
      categories.forEach(category => {
        this.animeService.getAnimeByStatus$(category.id!).subscribe(anime => {
          animeMap.set(category.id!, anime);
          this.animeByCategory.set(new Map(animeMap));
        });
      });
    });
  }

  getAnimeForCategory(categoryId: number): Anime[] {
    const allAnime = this.animeByCategory().get(categoryId) || [];
    const year = this.selectedYear();
    
    if (year === 'all') {
      return allAnime;
    }
    
    // Filter by year
    const yearNum = parseInt(year);
    return allAnime.filter(anime => anime.releaseYear === yearNum);
  }

  toggleSection(categoryId: number) {
    if (this.collapsedSections.has(categoryId)) {
      this.collapsedSections.delete(categoryId);
    } else {
      this.collapsedSections.add(categoryId);
    }
  }

  isSectionCollapsed(categoryId: number): boolean {
    return this.collapsedSections.has(categoryId);
  }

  onYearChange(year: string) {
    this.selectedYear.set(year);
  }

  onAnimeClick(anime: Anime) {
    this.animeClick.emit(anime);
  }

  onEditAnime(anime: Anime, event: Event) {
    event.stopPropagation();
    this.editAnime.emit(anime);
  }

  onAddAnime(categoryId: number) {
    this.addAnimeToCategory.emit(categoryId);
  }
}
