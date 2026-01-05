import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { ListViewComponent } from '../../components/list-view/list-view.component';
import { DialogService } from '../../services/dialog.service';
import { MobileLibraryComponent } from '../../components/mobile-library/mobile-library.component';
import { Anime } from '../../models/anime.model';
import { LucideAngularModule, LayoutGrid, List } from 'lucide-angular';

type ViewMode = 'kanban' | 'list';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    KanbanBoardComponent,
    ListViewComponent,
    MobileLibraryComponent,
    LucideAngularModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private dialogService = inject(DialogService);

  readonly LayoutGridIcon = LayoutGrid;
  readonly ListIcon = List;

  viewMode = signal<ViewMode>('kanban');

  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
    // Save preference to localStorage
    localStorage.setItem('anime-library-view-mode', mode);
  }

  ngOnInit() {
    // Load saved preference
    const savedMode = localStorage.getItem('anime-library-view-mode') as ViewMode;
    if (savedMode) {
      this.viewMode.set(savedMode);
    }
  }

  openAddDialog() {
    this.dialogService.openAddAnime();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.dialogService.openAddAnime(categoryId);
  }

  openAnimeDetails(anime: Anime) {
    this.dialogService.openAnimeDetails(anime);
  }

  openEditAnime(anime: Anime) {
    this.dialogService.openEditAnime(anime);
  }
}
