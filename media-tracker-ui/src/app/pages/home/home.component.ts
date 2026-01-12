import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { KanbanBoardComponent } from '../../components/kanban-board/kanban-board.component';
import { ListViewComponent } from '../../components/list-view/list-view.component';
import { DialogService } from '../../services/dialog.service';
import { MobileLibraryComponent } from '../../components/mobile-library/mobile-library.component';
import { Anime } from '../../models/anime.model';
import { MediaItem } from '../../models/media-type.model';
import { MediaTypeStateService } from '../../services/media-type-state.service';
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
  private mediaTypeState = inject(MediaTypeStateService);

  readonly LayoutGridIcon = LayoutGrid;
  readonly ListIcon = List;

  viewMode = signal<ViewMode>('kanban');
  selectedMediaType$ = this.mediaTypeState.getSelectedMediaType$();

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

  private router = inject(Router);

  openAddDialog() {
    this.dialogService.openAddMedia();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.dialogService.openAddMedia(categoryId);
  }

  openAnimeDetails(media: MediaItem | Anime) {
    if (!media.id) return;
    const type = (media as MediaItem).mediaTypeId;
    if (type === 1) { // Anime
      this.router.navigate(['/anime', media.id]);
    } else if (type === 3) { // Game
      this.router.navigate(['/game', media.id]);
    } else {
      this.router.navigate(['/media', media.id]);
    }
  }

  openEditAnime(media: MediaItem | Anime) {
    this.dialogService.openEditMedia(media);
  }
}
