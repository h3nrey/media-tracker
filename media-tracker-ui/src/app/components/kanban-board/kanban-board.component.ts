import { Component, OnInit, OnDestroy, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription, combineLatest, switchMap, map } from 'rxjs';
import { MediaItem, MediaType } from '../../models/media-type.model';
import { MediaService, MediaByCategory } from '../../services/media.service';
import { CategoryService } from '../../services/status.service';
import { FilterService } from '../../services/filter.service';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { AlertService } from '../../services/alert.service';
import { KanbanAnimeCard } from '../../pages/home/components/kanban-anime-card/kanban-anime-card';
import { KanbanGameCard } from '../../pages/home/components/kanban-game-card/kanban-game-card.component';
import { LucideAngularModule } from 'lucide-angular';
import { ListViewSelectionBarComponent } from '../list-view/components/list-view-selection-bar/list-view-selection-bar.component';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, KanbanAnimeCard, KanbanGameCard, LucideAngularModule, ListViewSelectionBarComponent],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  @Output() addAnimeToCategory = new EventEmitter<number>();
  @Output() animeClick = new EventEmitter<MediaItem>();
  @Output() editAnime = new EventEmitter<MediaItem>();
  
  columns = signal<MediaByCategory[]>([]);
  loading = signal(true);
  selectedIds = signal<Set<number>>(new Set());
  private lastClickedId = signal<number | null>(null);
  private subscription?: Subscription;

  constructor(
    private mediaService: MediaService,
    private categoryService: CategoryService,
    private filterService: FilterService,
    private mediaTypeState: MediaTypeStateService,
    private alertService: AlertService
  ) {}

  // ...

  onEdit(media: MediaItem) {
    this.editAnime.emit(media);
  }

  async onDelete(media: MediaItem) {
    const selected = this.selectedIds();
    let itemsToDelete: MediaItem[] = [];

    if (selected.has(media.id!)) {
      itemsToDelete = this.columns().flatMap(c => c.media).filter(m => selected.has(m.id!));
    } else {
      itemsToDelete = [media];
    }

    const confirmed = await this.alertService.showConfirm(
      itemsToDelete.length === 1
        ? `Are you sure you want to delete "${media.title}"?`
        : `Are you sure you want to delete ${itemsToDelete.length} selected items?`,
      'Delete Media',
      'error'
    );

    if (confirmed) {
      for (const item of itemsToDelete) {
        if (item.id) {
          await this.mediaService.deleteMedia(item.id);
        }
      }
      this.selectedIds.set(new Set());
    }
  }

  onMediaClick({ media, event }: { media: MediaItem, event: MouseEvent }) {
    const isShift = event.shiftKey;
    const isCtrl = event.ctrlKey || event.metaKey;
    const currentId = media.id!;
    const categoryId = media.statusId;

    if (isShift || isCtrl) {
      if (isShift && this.lastClickedId()) {
        const column = this.columns().find(c => c.category.supabaseId === categoryId);
        if (column) {
          const lastId = this.lastClickedId();
          const currentIndex = column.media.findIndex(m => m.id === currentId);
          const lastIndex = column.media.findIndex(m => m.id === lastId);

          if (currentIndex !== -1 && lastIndex !== -1) {
            const start = Math.min(currentIndex, lastIndex);
            const end = Math.max(currentIndex, lastIndex);
            const rangeIds = column.media.slice(start, end + 1).map(m => m.id!);
            
            const isCurrentlySelected = this.selectedIds().has(currentId);

            this.selectedIds.update(set => {
              const newSet = new Set(set);
              if (isCurrentlySelected) {
                rangeIds.forEach(id => newSet.delete(id));
              } else {
                rangeIds.forEach(id => newSet.add(id));
              }
              return newSet;
            });
            this.lastClickedId.set(currentId);
            return;
          }
        }
      }
      
      // Fallback for Shift without lastClickedId or for Ctrl
      this.toggleSelection(currentId);
      return;
    }

    // Standard click (no modifiers): Select only this one and navigate
    this.selectedIds.set(new Set([currentId]));
    this.lastClickedId.set(currentId);
    this.animeClick.emit(media);
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

  async onIncrement(media: MediaItem) {
    if (!media.id) return;
    const current = media.progressCurrent || 0;
    const total = media.progressTotal || 0;
    
    if (total > 0 && current >= total) return; 

    await this.mediaService.updateMedia(media.id, { 
      progressCurrent: current + 1 
    });
  }

  async ngOnInit() {
    await this.loadKanbanData();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private async loadKanbanData() {
    try {
      this.loading.set(true);
      
      this.subscription = combineLatest([
        this.categoryService.getAllCategories$(),
        this.mediaTypeState.getSelectedMediaType$(),
        this.mediaService.filterUpdate$
      ]).pipe(
        switchMap(([categories, selectedType]) => {
          return this.mediaService.getAllMedia$(selectedType).pipe(
            map(allMedia => {
              const filteredMedia = this.filterService.filterMedia(allMedia);
              console.log("filteredMedia", filteredMedia);
              const columns: MediaByCategory[] = categories.filter(category => !category.isDeleted).map(category => ({
                category,
                media: filteredMedia.filter(m => m.statusId === category.supabaseId)
              }));
              console.log("columns", columns);
              return columns;
            })
          );
        })
      ).subscribe({
        next: (columns) => {
          this.columns.set(columns);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading kanban data:', error);
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error loading categories:', error);
      this.loading.set(false);
    }
  }

  async onDrop(event: CdkDragDrop<MediaItem[]>, targetCategoryId: number) {
    console.log("reorder", event);
    console.log("drag container", event.container)
    console.log("target ", targetCategoryId)
    if (event.previousContainer === event.container) {
      this.handleReorder(event);
    } else {
      await this.handleCategoryChange(event, targetCategoryId);
    }
  }

  private handleReorder(event: CdkDragDrop<MediaItem[]>) {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }

  private async handleCategoryChange(event: CdkDragDrop<MediaItem[]>, targetCategoryId: number) {
    const movedMedia = event.previousContainer.data[event.previousIndex];
    const selectedIds = this.selectedIds();
    
    // Determine which items to move
    let itemsToMove: MediaItem[] = [];
    if (selectedIds.has(movedMedia.id!)) {
      // Move all selected items that are in the previous container
      itemsToMove = event.previousContainer.data.filter(m => selectedIds.has(m.id!));
    } else {
      // Only move the dragged item
      itemsToMove = [movedMedia];
    }

    // Capture original indices and items for potential reversal
    const originalPositions = itemsToMove.map(item => ({
      item,
      index: event.previousContainer.data.indexOf(item)
    })).sort((a, b) => b.index - a.index); // Sort descending to not mess up indices during removal

    // UI Update: Move items locally
    originalPositions.forEach(pos => {
      const currentIndex = event.previousContainer.data.indexOf(pos.item);
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        currentIndex,
        event.container.data.length // Add to end of target
      );
    });

    // Database Update
    try {
      const updatePromises = itemsToMove.map(item => 
        this.mediaService.updateMediaStatus(item.id!, targetCategoryId)
      );
      await Promise.all(updatePromises);
      
      // Clear selection after bulk move if it was a bulk move
      if (itemsToMove.length > 1) {
        this.clearAllSelection();
      }
    } catch (error) {
      console.error('Error updating media status:', error);
      // Revert UI changes in case of error (reverse order to restore indices correctly)
      originalPositions.sort((a, b) => a.index - b.index).forEach(pos => {
        const currentIndex = event.container.data.indexOf(pos.item);
        if (currentIndex !== -1) {
          transferArrayItem(
            event.container.data,
            event.previousContainer.data,
            currentIndex,
            pos.index
          );
        }
      });
    }
  }

  getConnectedLists(): string[] {
    return this.columns().map((_, index) => `column-${index}`);
  }

  openAddDialog(supabaseId: number) {
    this.addAnimeToCategory.emit(supabaseId);
  }

  trackByCategoryId(index: number, column: MediaByCategory): number {
    return column.category.id || index;
  }

  trackByMediaId(index: number, media: MediaItem): number {
    return media.id || index;
  }
}
