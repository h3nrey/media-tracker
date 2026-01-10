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
import { BoardFiltersComponent } from '../board-filters/board-filters.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, KanbanAnimeCard, BoardFiltersComponent, LucideAngularModule],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  @Output() addAnimeToCategory = new EventEmitter<number>();
  @Output() animeClick = new EventEmitter<MediaItem>();
  @Output() editAnime = new EventEmitter<MediaItem>();
  
  columns = signal<MediaByCategory[]>([]);
  loading = signal(true);
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
    const confirmed = await this.alertService.showConfirm(
      `Are you sure you want to delete "${media.title}"?`,
      'Delete Media',
      'error'
    );
    if (confirmed) {
      await this.mediaService.deleteMedia(media.id!);
    }
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
    const media = event.previousContainer.data[event.previousIndex];
    console.log("media", media)
    
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    
    console.log('status atual', media.statusId)
    console.log('status novo', targetCategoryId)
    if (media.id) {
      try {
        await this.mediaService.updateMediaStatus(media.id, targetCategoryId);
      } catch (error) {
        console.error('Error updating media status:', error);
        transferArrayItem(
          event.container.data,
          event.previousContainer.data,
          event.currentIndex,
          event.previousIndex
        );
      }
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
