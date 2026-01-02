import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';

interface KanbanColumn {
  category: Category;
  anime: Anime[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit {
  columns = signal<KanbanColumn[]>([]);
  loading = signal(true);

  constructor(
    private animeService: AnimeService,
    private categoryService: CategoryService
  ) {}

  async ngOnInit() {
    await this.loadKanbanData();
  }

  private async loadKanbanData() {
    try {
      this.loading.set(true);
      
      const categories = await this.categoryService.getAllCategories();
      
      const allAnime = await this.animeService.getAllAnime$().subscribe(anime => {
        const columns: KanbanColumn[] = categories.map(category => ({
          category,
          anime: anime.filter(a => a.statusId === category.id)
        }));
        
        this.columns.set(columns);
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading kanban data:', error);
      this.loading.set(false);
    }
  }

  async onDrop(event: CdkDragDrop<Anime[]>, targetCategoryId: number) {
    const columns = this.columns();
    
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      const anime = event.previousContainer.data[event.previousIndex];
      
      if (anime.id) {
        await this.animeService.updateAnimeStatus(anime.id, targetCategoryId);
      }
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  getConnectedLists(): string[] {
    return this.columns().map((_, index) => `column-${index}`);
  }

  trackByCategoryId(index: number, column: KanbanColumn): number {
    return column.category.id || index;
  }

  trackByAnimeId(index: number, anime: Anime): number {
    return anime.id || index;
  }
}
