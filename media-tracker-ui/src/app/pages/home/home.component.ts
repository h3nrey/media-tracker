import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { DialogService } from '../../services/dialog.service';
import { MobileLibraryComponent } from '../../components/mobile-library/mobile-library.component';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    KanbanBoardComponent, 
    MobileLibraryComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private dialogService = inject(DialogService);

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
