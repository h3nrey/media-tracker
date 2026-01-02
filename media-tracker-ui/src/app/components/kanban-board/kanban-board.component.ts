import { Component, OnInit, OnDestroy, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription, combineLatest } from 'rxjs';
import { Anime } from '../../models/anime.model';
import { AnimeService, AnimeByCategory } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { FilterService } from '../../services/filter.service';
import { AnimeCard } from '../../pages/home/components/anime-card/anime-card';
import { BoardFiltersComponent } from '../board-filters/board-filters.component';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, AnimeCard, BoardFiltersComponent],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  @Output() addAnimeToCategory = new EventEmitter<number>();
  @Output() animeClick = new EventEmitter<Anime>();
  @Output() editAnime = new EventEmitter<Anime>();
  
  columns = signal<AnimeByCategory[]>([]);
  loading = signal(true);
  private subscription?: Subscription;

  constructor(
    private animeService: AnimeService,
    private categoryService: CategoryService,
    private filterService: FilterService
  ) {}

  // ...

  onEdit(anime: Anime) {
    this.editAnime.emit(anime);
  }

  async onDelete(anime: Anime) {
    if (confirm(`Are you sure you want to delete "${anime.title}"?`)) {
      await this.animeService.deleteAnime(anime.id!);
      // The board will auto-update due to reactive subscription
    }
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
        this.animeService.getAllAnime$(),
        this.animeService['filterUpdate$']
      ]).subscribe({
        next: ([categories, allAnime]) => {
          const filteredAnime = this.filterService.filterAnime(allAnime);
          const columns: AnimeByCategory[] = categories.map(category => ({
            category,
            anime: filteredAnime.filter(anime => anime.statusId === category.id)
          }));
          
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

  async onDrop(event: CdkDragDrop<Anime[]>, targetCategoryId: number) {
    if (event.previousContainer === event.container) {
      this.handleReorder(event);
    } else {
      await this.handleCategoryChange(event, targetCategoryId);
    }
  }

  private handleReorder(event: CdkDragDrop<Anime[]>) {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }

  private async handleCategoryChange(event: CdkDragDrop<Anime[]>, targetCategoryId: number) {
    const anime = event.previousContainer.data[event.previousIndex];
    
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    
    if (anime.id) {
      try {
        await this.animeService.updateAnimeStatus(anime.id, targetCategoryId);
      } catch (error) {
        console.error('Error updating anime status:', error);
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

  openAddDialog(categoryId: number) {
    this.addAnimeToCategory.emit(categoryId);
  }

  trackByCategoryId(index: number, column: AnimeByCategory): number {
    return column.category.id || index;
  }

  trackByAnimeId(index: number, anime: Anime): number {
    return anime.id || index;
  }
}
