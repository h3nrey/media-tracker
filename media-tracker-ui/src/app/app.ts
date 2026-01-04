import { Component, OnInit, signal, inject, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileNavComponent } from './components/mobile-library/mobile-nav/mobile-nav.component';
import { CategoryService } from './services/status.service';
import { SyncService } from './services/sync.service';
import { DialogService } from './services/dialog.service';

import { HeaderComponent } from './components/header/header.component';
import { AddAnimeDialogComponent } from './components/add-anime-dialog/add-anime-dialog.component';
import { ManageCategoriesDialogComponent } from './components/manage-categories-dialog/manage-categories-dialog.component';
import { ManageSourcesDialogComponent } from './components/manage-sources-dialog/manage-sources-dialog.component';
import { BulkImportDialogComponent } from './components/bulk-import-dialog/bulk-import-dialog.component';
import { MetadataSyncDialogComponent } from './components/metadata-sync-dialog/metadata-sync-dialog.component';
import { AnimeDetailsDialogComponent } from './components/anime-details-dialog/anime-details-dialog.component';
import { ThemeSettingsDialogComponent } from './components/theme-settings-dialog/theme-settings-dialog.component';
import { ToastComponent } from './components/ui/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    MobileNavComponent, 
    AddAnimeDialogComponent, 
    HeaderComponent,
    ManageCategoriesDialogComponent,
    ManageSourcesDialogComponent,
    BulkImportDialogComponent,
    MetadataSyncDialogComponent,
    AnimeDetailsDialogComponent,
    ThemeSettingsDialogComponent,
    ToastComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anime Tracker');
  private categoryService = inject(CategoryService);
  private syncService = inject(SyncService);
  private dialogService = inject(DialogService);

  @ViewChild(ManageCategoriesDialogComponent) manageCategoriesDialog!: ManageCategoriesDialogComponent;
  @ViewChild(ManageSourcesDialogComponent) manageSourcesDialog!: ManageSourcesDialogComponent;
  @ViewChild(BulkImportDialogComponent) bulkImportDialog!: BulkImportDialogComponent;
  @ViewChild(MetadataSyncDialogComponent) metadataSyncDialog!: MetadataSyncDialogComponent;
  @ViewChild(ThemeSettingsDialogComponent) themeSettingsDialog!: ThemeSettingsDialogComponent;
  
  async ngOnInit() {
    await this.syncService.sync(); // Initial sync first to pull existing categories
    await this.categoryService.seedDefaultCategories();
  }

  openAddDialog() {
    this.dialogService.openAddAnime();
  }

  openManageCategoriesDialog() {
    this.manageCategoriesDialog.open();
  }

  openManageSourcesDialog() {
    this.manageSourcesDialog.open();
  }

  openBulkImportDialog() {
    this.bulkImportDialog.open();
  }

  openMetadataSyncDialog() {
    this.metadataSyncDialog.open();
  }

  openThemeSettingsDialog() {
    this.themeSettingsDialog.open();
  }
}
