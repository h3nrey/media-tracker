import { Component, OnInit, signal, inject, ViewChild, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { MobileNavComponent } from './components/mobile-library/mobile-nav/mobile-nav.component';
import { CategoryService } from './services/status.service';
import { SyncService } from './services/sync.service';
import { DialogService } from './services/dialog.service';
import { AuthService } from './services/auth.service';

import { HeaderComponent } from './components/header/header.component';
import { AddMediaDialogComponent } from './components/add-media-dialog/add-media-dialog.component';
import { ManageCategoriesDialogComponent } from './components/manage-categories-dialog/manage-categories-dialog.component';
import { ManageSourcesDialogComponent } from './components/manage-sources-dialog/manage-sources-dialog.component';
import { BulkImportDialogComponent } from './components/bulk-import-dialog/bulk-import-dialog.component';
import { MetadataSyncDialogComponent } from './components/metadata-sync-dialog/metadata-sync-dialog.component';
import { ThemeSettingsDialogComponent } from './components/theme-settings-dialog/theme-settings-dialog.component';
import { ToastComponent } from './components/ui/toast/toast.component';
import { AlertComponent } from './components/ui/alert/alert.component';
import { ShortcutsDialogComponent } from './components/shortcuts-dialog/shortcuts-dialog.component';
import { ShortcutService } from './services/shortcut.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, 
    MobileNavComponent, 
    AddMediaDialogComponent, 
    HeaderComponent,
    ManageCategoriesDialogComponent,
    ManageSourcesDialogComponent,
    BulkImportDialogComponent,
    MetadataSyncDialogComponent,
    ThemeSettingsDialogComponent,
    ToastComponent,
    AlertComponent,
    ShortcutsDialogComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anime Tracker');
  private categoryService = inject(CategoryService);
  private syncService = inject(SyncService);
  private dialogService = inject(DialogService);
  private shortcutService = inject(ShortcutService);
  private router = inject(Router);
  private authService = inject(AuthService);

  showHeader = signal(true);

  @ViewChild(ManageCategoriesDialogComponent) manageCategoriesDialog!: ManageCategoriesDialogComponent;
  @ViewChild(ManageSourcesDialogComponent) manageSourcesDialog!: ManageSourcesDialogComponent;
  @ViewChild(BulkImportDialogComponent) bulkImportDialog!: BulkImportDialogComponent;
  @ViewChild(MetadataSyncDialogComponent) metadataSyncDialog!: MetadataSyncDialogComponent;
  @ViewChild(ThemeSettingsDialogComponent) themeSettingsDialog!: ThemeSettingsDialogComponent;
  
  constructor() {
    effect(() => {
      this.handleSync();
    });
  }

  async ngOnInit() {
    this.handleHeader();
  }

  handleSync() {
    const user = this.authService.currentUser();
    if (user) {
      console.log('User logged in, triggering sync');
      this.syncService.sync();
      this.categoryService.seedDefaultCategories();
    }
  }

  handleHeader() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.showHeader.set(!event.url.includes('/landing'));
    });

    this.showHeader.set(!this.router.url.includes('/landing'));
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

