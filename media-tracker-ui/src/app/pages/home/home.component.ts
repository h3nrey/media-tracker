import { Component, inject, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
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
import { ViewModeService, ViewMode } from '../../services/view-mode.service';
import { BoardFiltersComponent } from '../../components/board-filters/board-filters.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    KanbanBoardComponent,
    ListViewComponent,
    MobileLibraryComponent,
    LucideAngularModule,
    BoardFiltersComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  animations: [
    trigger('fadeTransition', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class HomeComponent {
  private dialogService = inject(DialogService);
  private mediaTypeState = inject(MediaTypeStateService);
  private viewModeService = inject(ViewModeService);

  viewMode = this.viewModeService.viewMode;
  selectedMediaType$ = this.mediaTypeState.getSelectedMediaType$();


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
