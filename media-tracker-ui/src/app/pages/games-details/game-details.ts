import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService } from '../../services/media.service';
import { GameService } from '../../services/game.service';
import { CategoryService } from '../../services/status.service';
import { ListService } from '../../services/list.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { MediaItem } from '../../models/media-type.model';
import { GameMetadata } from '../../models/game-metadata.model';
import { Category } from '../../models/status.model';
import { List } from '../../models/list.model';
import { MediaLog } from '../../models/media-log.model';
import { take, Subscription } from 'rxjs';
import { GameDetails } from './game-details.model';

import { LucideAngularModule } from 'lucide-angular';
import { GameSidebarComponent } from './components/game-sidebar/game-sidebar.component';
import { GameInfoComponent } from './components/game-info/game-info.component';
import { GameListsComponent } from './components/game-lists/game-lists.component';
import { GameHistoryComponent } from './components/game-history/game-history.component';
import { MediaReviewsComponent } from '../../components/media-reviews/media-reviews.component';

@Component({
  selector: 'app-games-details',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    GameSidebarComponent,
    GameInfoComponent,
    GameListsComponent,
    GameHistoryComponent,
    MediaReviewsComponent
  ],
  templateUrl: './game-details.html',
  styleUrl: './game-details.scss'
})
export class GamesDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private mediaService = inject(MediaService);
  private gameService = inject(GameService);
  private categoryService = inject(CategoryService);
  private listService = inject(ListService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  game = signal<GameDetails | null>(null);
  category = signal<Category | null>(null);
  categories = signal<Category[]>([]);
  lists = signal<List[]>([]);
  isLoading = signal(true);
  private sub = new Subscription();

  async ngOnInit() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats.filter(c => !c.isDeleted));
    });

    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadData(id);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  loadData(id: number) {
    this.isLoading.set(true);
    
    this.sub.add(
      this.mediaService.getMediaById$(id).subscribe(async mediaData => {
        if (mediaData) {
          const metadata = await this.mediaService.getGameMetadata(id);
          this.game.set({ ...mediaData, metadata });
          
          if (mediaData.statusId) {
            const cat = await this.categoryService.getCategoryById(mediaData.statusId);
            this.category.set(cat || null);
          }

          this.listService.getListsContainingItem$(id).pipe(take(1)).subscribe((listsData: List[]) => {
              this.lists.set(listsData);
          });
        } else {
          this.router.navigate(['/404']);
        }
        this.isLoading.set(false);
      })
    );
  }

  getTagline() {
    const notes = this.game()?.notes;
    if (!notes || notes.length < 15) return '';
    const firstSentence = notes.split(/[.!?]/)[0];
    return (firstSentence.length > 10 && firstSentence.length < 80) ? firstSentence.toUpperCase() : '';
  }

  onEdit() {
    const currentGame = this.game();
    if (currentGame) {
      this.dialogService.openEditMedia(currentGame);
    }
  }

  async onAddLog() {
    const currentGame = this.game();
    if (!currentGame || !currentGame.id) return;

    const logs = [...(currentGame.logs || []), { mediaItemId: currentGame.id, startDate: new Date(), endDate: new Date() }];
    await this.gameService.updateGame(currentGame.id, { logs });
    this.game.update(g => g ? { ...g, logs } : null);
  }

  async onRemoveLog(index: number) {
    const currentGame = this.game();
    if (!currentGame || !currentGame.id || !currentGame.logs) return;

    const logs = [...currentGame.logs];
    logs.splice(index, 1);
    
    await this.gameService.updateGame(currentGame.id, { logs });
    this.game.update(g => g ? { ...g, logs } : null);
  }

  async onUpdateLog(event: { index: number, log: Partial<MediaLog> }) {
    const currentGame = this.game();
    if (!currentGame || !currentGame.id || !currentGame.logs) return;

    const logs = [...currentGame.logs];
    logs[event.index] = { ...logs[event.index], ...event.log };

    await this.gameService.updateGame(currentGame.id, { logs });
    this.game.update(g => g ? { ...g, logs } : null);
  }

  async onUpdateScore(score: number) {
    const currentGame = this.game();
    if (!currentGame || !currentGame.id) return;

    await this.gameService.updateGame(currentGame.id, { score });
    this.game.update(g => g ? { ...g, score } : null);
  }

  async onSaveLinks(sourceLinks: any[]) {
    const currentGame = this.game();
    if (!currentGame || !currentGame.id) return;

    await this.gameService.updateGame(currentGame.id, { sourceLinks });
    this.game.update(g => g ? { ...g, sourceLinks } : null);
  }

  async onUpdateCategory(statusId: number) {
    const currentGame = this.game();
    if (!currentGame || !currentGame.id) return;

    await this.gameService.updateGame(currentGame.id, { statusId });
    // Reload category object
    const cat = await this.categoryService.getCategoryById(statusId);
    this.category.set(cat || null);
    this.game.update(g => g ? { ...g, statusId } : null);
  }
}
