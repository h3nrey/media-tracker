import { Component, OnInit, signal, inject, ViewChild, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { MediaService } from './services/media.service';
import { MobileNavComponent } from './components/mobile-library/mobile-nav/mobile-nav.component';
import { CategoryService } from './services/status.service';
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
import { AddRunDialogComponent } from './components/media-runs/add-run-dialog/add-run-dialog.component';
import { RunDetailsDialogComponent } from './components/media-runs/run-details-dialog/run-details-dialog.component';
import { MediaRunService } from './services/media-run.service';
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
    ShortcutsDialogComponent,
    AddRunDialogComponent,
    RunDetailsDialogComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anime Tracker');
  private categoryService = inject(CategoryService);
  public dialogService = inject(DialogService);
  private shortcutService = inject(ShortcutService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private runService = inject(MediaRunService);
  private mediaService = inject(MediaService);

  showHeader = signal(true);

  @ViewChild(ManageCategoriesDialogComponent) manageCategoriesDialog!: ManageCategoriesDialogComponent;
  @ViewChild(ManageSourcesDialogComponent) manageSourcesDialog!: ManageSourcesDialogComponent;
  @ViewChild(BulkImportDialogComponent) bulkImportDialog!: BulkImportDialogComponent;
  @ViewChild(MetadataSyncDialogComponent) metadataSyncDialog!: MetadataSyncDialogComponent;
  @ViewChild(ThemeSettingsDialogComponent) themeSettingsDialog!: ThemeSettingsDialogComponent;
  

  async ngOnInit() {
    this.handleHeader();
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

  async onConfirmAddRun(data: { startDate: Date, endDate?: Date, notes?: string }) {
    const runData = this.dialogService.currentAddRunData();
    if (!runData) return;

    try {
      await this.runService.createRun({
        mediaItemId: runData.mediaItemId,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
        runNumber: 0
      } as any);
      this.dialogService.closeAddRun();
      // We don't need to manually refresh here because the individual components listen to DB changes usually 
      // or we can emit an event if needed. But MediaRunsListComponent already does a loadRuns.
      // Wait, if it's on a different component, we might need a way to tell it to refresh.
      // But actually MediaRunsListComponent reloads on certain triggers.
    } catch (error: any) {
      console.error('Failed to create run:', error);
    }
  }

  async onRunUpdated() {
    this.mediaService.triggerFilterUpdate();
    
    // Refresh the run data in the dialog 
    const currentRun = this.dialogService.currentRunDetails();
    if (currentRun?.id) {
      const updatedRun = await this.runService.getRunById(currentRun.id);
      if (updatedRun) {
        this.dialogService.updateSelectedRun(updatedRun);
      }
    }
  }
}

