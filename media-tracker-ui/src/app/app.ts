import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileNavComponent } from './components/mobile-library/mobile-nav/mobile-nav.component';
import { CategoryService } from './services/status.service';
import { SyncService } from './services/sync.service';

import { AddAnimeDialogComponent } from './components/add-anime-dialog/add-anime-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MobileNavComponent, AddAnimeDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Anime Tracker');
  private categoryService = inject(CategoryService);
  private syncService = inject(SyncService);

  async ngOnInit() {
    await this.syncService.sync(); // Initial sync first to pull existing categories
    await this.categoryService.seedDefaultCategories();
  }
}
