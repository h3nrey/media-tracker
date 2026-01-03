import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { DialogService } from '../../services/dialog.service';
import { ManageCategoriesDialogComponent } from '../../components/manage-categories-dialog/manage-categories-dialog.component';
import { ManageSourcesDialogComponent } from '../../components/manage-sources-dialog/manage-sources-dialog.component';
import { AnimeDetailsDialogComponent } from '../../components/anime-details-dialog/anime-details-dialog.component';
import { BulkImportDialogComponent } from '../../components/bulk-import-dialog/bulk-import-dialog.component';
import { MetadataSyncDialogComponent } from '../../components/metadata-sync-dialog/metadata-sync-dialog.component';
import { HeaderComponent } from '../../components/header/header.component';
import { MobileLibraryComponent } from '../../components/mobile-library/mobile-library.component';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    KanbanBoardComponent, 
    MobileLibraryComponent, 
    ManageCategoriesDialogComponent, 
    ManageSourcesDialogComponent, 
    AnimeDetailsDialogComponent, 
    BulkImportDialogComponent,
    MetadataSyncDialogComponent,
    HeaderComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private dialogService = inject(DialogService);

  @ViewChild(ManageCategoriesDialogComponent) manageCategoriesDialog!: ManageCategoriesDialogComponent;
  @ViewChild(ManageSourcesDialogComponent) manageSourcesDialog!: ManageSourcesDialogComponent;
  @ViewChild(AnimeDetailsDialogComponent) animeDetailsDialog!: AnimeDetailsDialogComponent;
  @ViewChild(BulkImportDialogComponent) bulkImportDialog!: BulkImportDialogComponent;
  @ViewChild(MetadataSyncDialogComponent) metadataSyncDialog!: MetadataSyncDialogComponent;

  openAddDialog() {
    this.dialogService.openAddAnime();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.dialogService.openAddAnime(categoryId);
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

  openBulkImportDialog() {
    this.bulkImportDialog.open();
  }

  openMetadataSyncDialog() {
    this.metadataSyncDialog.open();
  }

  openEditAnime(anime: Anime) {
    this.dialogService.openEditAnime(anime);
  }
}
