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
import { AlertService } from '../../services/alert.service';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    KanbanBoardComponent,
    ListViewComponent,
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
  private alertService = inject(AlertService);
  private mediaService = inject(MediaService);

  viewMode = this.viewModeService.viewMode;
  selectedMediaType$ = this.mediaTypeState.getSelectedMediaType$();


  private router = inject(Router);

  openAddDialog() {
    this.dialogService.openAddMedia();
  }

  openAddDialogWithCategory(categoryId: number) {
    this.dialogService.openAddMedia(categoryId);
  }

  openAnimeDetails(media: MediaItem | Anime, event?: MouseEvent) {
    if (!media.id) return;
    
    // Don't navigate if clicking with modifier keys (handling Multi-selection)
    if (event?.shiftKey || event?.ctrlKey || event?.metaKey) return;
    
    const type = (media as MediaItem).mediaTypeId;
    if (type === 1) { // Anime
      this.router.navigate(['/anime', media.id]);
    } else if (type === 2) { // Manga
      this.router.navigate(['/manga', media.id]);
    } else if (type === 3) { // Game
      this.router.navigate(['/game', media.id]);
    } else if (type === 4) { // Movie
      this.router.navigate(['/movie', media.id]);
    } else {
      this.router.navigate(['/media', media.id]);
    }
  }

  openEditAnime(media: MediaItem | Anime) {
    this.dialogService.openEditAnime(media);
  }

  async onDeleteMedia(items: (MediaItem | Anime) | (MediaItem | Anime)[]) {
    const mediaList = Array.isArray(items) ? items : [items];
    if (mediaList.length === 0) return;

    const message = mediaList.length === 1 
      ? `Tem certeza que deseja excluir "${mediaList[0].title}"?`
      : `Tem certeza que deseja excluir os ${mediaList.length} itens selecionados?`;

    const confirmed = await this.alertService.showConfirm(
      message,
      'Confirmar Exclusão',
      'error'
    );

    if (confirmed) {
      for (const media of mediaList) {
        if (media.id) {
          await this.mediaService.deleteMedia(media.id);
        }
      }
    }
  }
}
