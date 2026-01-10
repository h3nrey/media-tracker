import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { MediaService } from '../../services/media.service';
import { CategoryService } from '../../services/status.service';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { MediaItem } from '../../models/media-type.model';
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
  private mediaService = inject(MediaService);
  private categoryService = inject(CategoryService);
  private mediaTypeState = inject(MediaTypeStateService);

  @Output() animeClick = new EventEmitter<MediaItem>();
  @Output() editAnime = new EventEmitter<MediaItem>();
  @Output() addAnimeToCategory = new EventEmitter<number>();

  readonly PlusIcon = Plus;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;

  categories = signal<Category[]>([]);
  mediaByCategory = signal<Map<number, MediaItem[]>>(new Map());
  collapsedSections = new Set<number>(); // Track collapsed categories (using supabaseId)
  
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
    combineLatest([
      this.categoryService.getAllCategories$(),
      this.mediaTypeState.getSelectedMediaType$()
    ]).subscribe(([categories, selectedType]) => {
      this.categories.set(categories);
      
      // Load media for each category
      const mediaMap = new Map<number, MediaItem[]>();
      
      categories.forEach(category => {
        const catId = category.supabaseId!;
        this.mediaService.getMediaByStatus$(catId, selectedType).subscribe(media => {
          mediaMap.set(catId, media);
          this.mediaByCategory.set(new Map(mediaMap));
        });
      });
    });
  }

  getMediaForCategory(supabaseId: number): MediaItem[] {
    const allMedia = this.mediaByCategory().get(supabaseId) || [];
    const year = this.selectedYear();
    
    if (year === 'all') {
      return allMedia;
    }
    
    // Filter by year
    const yearNum = parseInt(year);
    return allMedia.filter(m => m.releaseYear === yearNum);
  }

  toggleSection(supabaseId: number) {
    if (this.collapsedSections.has(supabaseId)) {
      this.collapsedSections.delete(supabaseId);
    } else {
      this.collapsedSections.add(supabaseId);
    }
  }

  isSectionCollapsed(supabaseId: number): boolean {
    return this.collapsedSections.has(supabaseId);
  }

  onYearChange(year: string) {
    this.selectedYear.set(year);
  }

  onMediaClick(media: MediaItem) {
    this.animeClick.emit(media);
  }

  onEditMedia(media: MediaItem, event: Event) {
    event.stopPropagation();
    this.editAnime.emit(media);
  }

  onAddMedia(supabaseId: number) {
    this.addAnimeToCategory.emit(supabaseId);
  }
}
