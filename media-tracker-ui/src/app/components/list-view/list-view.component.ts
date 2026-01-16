import { Component, inject, signal, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest, switchMap, map } from 'rxjs';
import { MediaService } from '../../services/media.service';
import { CategoryService } from '../../services/status.service';
import { FilterService } from '../../services/filter.service';
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
export class ListViewComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private categoryService = inject(CategoryService);
  private mediaTypeState = inject(MediaTypeStateService);
  private filterService = inject(FilterService);

  @Output() animeClick = new EventEmitter<MediaItem>();
  @Output() editAnime = new EventEmitter<MediaItem>();
  @Output() addAnimeToCategory = new EventEmitter<number>();

  readonly PlusIcon = Plus;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;

  categories = signal<Category[]>([]);
  mediaByCategory = signal<Map<number, MediaItem[]>>(new Map());
  collapsedSections = new Set<number>(); // Track collapsed categories (using supabaseId)
  
  loading = signal(true);
  private subscription?: Subscription;

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  loadData() {
    this.loading.set(true);
    this.subscription = combineLatest([
      this.categoryService.getAllCategories$(),
      this.mediaTypeState.getSelectedMediaType$(),
      this.mediaService.filterUpdate$
    ]).pipe(
      switchMap(([categories, selectedType]) => {
        return this.mediaService.getAllMedia$(selectedType).pipe(
          map((allMedia: MediaItem[]) => {
            const filteredMedia = this.filterService.filterMedia(allMedia);
            const mediaMap = new Map<number, MediaItem[]>();
            
            categories.forEach((category: Category) => {
              const catId = category.supabaseId!;
              mediaMap.set(catId, filteredMedia.filter(m => m.statusId === catId));
            });
            
            return { categories, mediaMap };
          })
        );
      })
    ).subscribe({
      next: ({ categories, mediaMap }: { categories: Category[], mediaMap: Map<number, MediaItem[]> }) => {
        this.categories.set(categories);
        this.mediaByCategory.set(mediaMap);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getMediaForCategory(supabaseId: number): MediaItem[] {
    const allMedia = this.mediaByCategory().get(supabaseId) || [];
    return this.filterService.filterMedia(allMedia);
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
