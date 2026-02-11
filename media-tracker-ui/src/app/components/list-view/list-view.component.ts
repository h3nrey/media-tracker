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
import { ListViewCardComponent } from './components/list-view-card/list-view-card.component';
import { MediaType } from '../../models/media-type.model';
import { AlertService } from '../../services/alert.service';
import { ListViewSelectionBarComponent } from './components/list-view-selection-bar/list-view-selection-bar.component';

@Component({
  selector: 'app-list-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ListViewCardComponent, ListViewSelectionBarComponent],
  templateUrl: './list-view.component.html',
  styleUrl: './list-view.component.scss'
})
export class ListViewComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private categoryService = inject(CategoryService);
  private mediaTypeState = inject(MediaTypeStateService);
  private filterService = inject(FilterService);
  private alertService = inject(AlertService);

  @Output() animeClick = new EventEmitter<{ media: MediaItem, event?: MouseEvent }>();
  @Output() editAnime = new EventEmitter<MediaItem>();
  @Output() deleteAnime = new EventEmitter<MediaItem[]>();
  @Output() addAnimeToCategory = new EventEmitter<number>();

  readonly PlusIcon = Plus;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;
  readonly MediaType = MediaType;

  categories = signal<Category[]>([]);
  mediaByCategory = signal<Map<number, MediaItem[]>>(new Map());
  collapsedSections = new Set<number>(); // Track collapsed categories (using local id)
  
  loading = signal(true);
  selectedIds = signal<Set<number>>(new Set());
  private lastClickedId = signal<number | null>(null);
  
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
              const catId = category.id!;
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

  getMediaForCategory(categoryId: number): MediaItem[] {
    const allMedia = this.mediaByCategory().get(categoryId) || [];
    return this.filterService.filterMedia(allMedia);
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

  private toggleSelection(id: number) {
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    this.lastClickedId.set(id);
  }

  clearAllSelection() {
    this.selectedIds.set(new Set());
    this.lastClickedId.set(null);
  }

  onMediaClick(media: MediaItem, event?: MouseEvent) {
    const isShift = event?.shiftKey;
    const isCtrl = event?.ctrlKey || event?.metaKey;
    const currentId = media.id!;
    const categoryId = media.statusId;

    if (isShift && this.lastClickedId()) {
      const categoryMedia = this.getMediaForCategory(categoryId);
      const lastId = this.lastClickedId();
      
      const currentIndex = categoryMedia.findIndex(m => m.id === currentId);
      const lastIndex = categoryMedia.findIndex(m => m.id === lastId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = categoryMedia.slice(start, end + 1).map(m => m.id!);
        
        const isCurrentlySelected = this.selectedIds().has(currentId);

        this.selectedIds.update(set => {
          const newSet = new Set(set);
          if (isCurrentlySelected) {
            // Deselect range
            rangeIds.forEach(id => newSet.delete(id));
          } else {
            // Select range
            rangeIds.forEach(id => newSet.add(id));
          }
          return newSet;
        });
      } else {
        // Fallback: just toggle this one if categories don't match or no valid range
        this.toggleSelection(currentId);
      }
    } else if (isCtrl) {
      this.toggleSelection(currentId);
    } else {
      // Standard click: select only this one
      this.selectedIds.set(new Set([currentId]));
      this.lastClickedId.set(currentId);
    }
    
    this.animeClick.emit({ media, event });
  }

  onEditMedia(media: MediaItem, event: Event) {
    event.stopPropagation();
    this.editAnime.emit(media);
  }

  onDeleteMedia(media: MediaItem, event: Event) {
    event.stopPropagation();
    
    const selected = this.selectedIds();
    if (selected.has(media.id!)) {
      // Delete all selected items that are in the current view
      const allShownMedia = Array.from(this.mediaByCategory().values()).flat();
      const itemsToDelete = allShownMedia.filter(m => selected.has(m.id!));
      this.deleteAnime.emit(itemsToDelete);
      this.selectedIds.set(new Set()); // Clear selection after deletion
    } else {
      // Delete just this one
      this.deleteAnime.emit([media]);
    }
  }

  async onStatusChangeMedia(media: MediaItem, statusId: number) {
    const selected = this.selectedIds();
    let itemsToUpdate: MediaItem[] = [];

    if (selected.has(media.id!)) {
      const allShownMedia = Array.from(this.mediaByCategory().values()).flat();
      itemsToUpdate = allShownMedia.filter(m => selected.has(m.id!));
    } else {
      itemsToUpdate = [media];
    }

    const confirmed = await this.alertService.showConfirm(
      itemsToUpdate.length === 1 
        ? `Alterar o status de "${media.title}"?`
        : `Alterar o status de ${itemsToUpdate.length} itens selecionados?`,
      'Alterar Status',
      'info'
    );

    if (confirmed) {
      for (const item of itemsToUpdate) {
        if (item.id) {
          await this.mediaService.updateMediaStatus(item.id, statusId as number);
        }
      }
      if (itemsToUpdate.length > 1) {
        this.selectedIds.set(new Set());
      }
    }
  }

  onAddMedia(categoryId: number) {
    this.addAnimeToCategory.emit(categoryId);
  }
}
