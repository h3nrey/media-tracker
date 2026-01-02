import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { AddAnimeDialogComponent } from '../../components/add-anime-dialog/add-anime-dialog.component';
import { ManageCategoriesDialogComponent } from '../../components/manage-categories-dialog/manage-categories-dialog.component';
import { ManageSourcesDialogComponent } from '../../components/manage-sources-dialog/manage-sources-dialog.component';
import { AnimeDetailsDialogComponent } from '../../components/anime-details-dialog/anime-details-dialog.component';
import { HeaderComponent } from '../../components/header/header.component';
import { MobileLibraryComponent } from '../../components/mobile-library/mobile-library.component';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, KanbanBoardComponent, MobileLibraryComponent, AddAnimeDialogComponent, ManageCategoriesDialogComponent, ManageSourcesDialogComponent, AnimeDetailsDialogComponent, HeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  @ViewChild(AddAnimeDialogComponent) addDialog!: AddAnimeDialogComponent;
  @ViewChild(ManageCategoriesDialogComponent) manageCategoriesDialog!: ManageCategoriesDialogComponent;
  @ViewChild(ManageSourcesDialogComponent) manageSourcesDialog!: ManageSourcesDialogComponent;
  @ViewChild(AnimeDetailsDialogComponent) animeDetailsDialog!: AnimeDetailsDialogComponent;

  openAddDialog() {
    this.addDialog.open();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.addDialog.openWithCategory(categoryId);
  }

  openManageCategoriesDialog() {
    this.manageCategoriesDialog.open();
  }

  openManageSourcesDialog() {
    this.manageSourcesDialog.open();
  }

  openAnimeDetails(anime: Anime) {
    this.animeDetailsDialog.open(anime);
  }

  openEditAnime(anime: Anime) {
    this.addDialog.openForEdit(anime);
  }
}
