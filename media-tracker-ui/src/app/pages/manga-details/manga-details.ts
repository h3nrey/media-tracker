import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MangaService } from '../../services/manga.service';
import { CategoryService } from '../../services/status.service';
import { ListService } from '../../services/list.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { MediaItem } from '../../models/media-type.model';
import { Category } from '../../models/status.model';
import { List } from '../../models/list.model';
import { MediaRun } from '../../models/media-run.model';
import { MediaRunService } from '../../services/media-run.service';
import { ChapterProgressService } from '../../services/chapter-progress.service';
import { take, Subscription } from 'rxjs';

import { MediaRunsListComponent } from '../../components/media-runs/media-runs-list.component';
import { MediaReviewsComponent } from '../../components/media-reviews/media-reviews.component';
import { MediaListSectionComponent } from '../../components/media-list-section/media-list-section.component';
import { MediaProgressActionsComponent } from '../../components/media-progress-actions/media-progress-actions.component';
import { LucideAngularModule } from 'lucide-angular';


@Component({
  selector: 'app-manga-details',
  standalone: true,
  imports: [
    CommonModule,
    MediaRunsListComponent,
    MediaReviewsComponent,
    MediaListSectionComponent,
    MediaProgressActionsComponent,
    LucideAngularModule
  ],
  templateUrl: './manga-details.html',
  styleUrl: './manga-details.scss',
})
export class MangaDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private mangaService = inject(MangaService);
  private categoryService = inject(CategoryService);
  private listService = inject(ListService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private runService = inject(MediaRunService);
  private progressService = inject(ChapterProgressService);
  private router = inject(Router);

  manga = signal<any | null>(null);
  category = signal<Category | null>(null);
  categories = signal<Category[]>([]);
  lists = signal<List[]>([]);
  isLoading = signal(true);
  hoveredScore = signal<number | null>(null);
  activeRun = signal<MediaRun | null>(null);
  activeRunChapterCount = signal<number>(0);
  private sub = new Subscription();

  constructor() {
    // Load active run when manga changes
    effect(() => {
      const currentManga = this.manga();
      if (currentManga?.id) {
        this.loadActiveRun(currentManga.id);
      }
    });

    // Track chapter progress for active run
    effect(() => {
      const run = this.activeRun();
      if (run?.id) {
        const subscription = this.progressService.getChaptersForRun$(run.id).subscribe(chapters => {
          this.activeRunChapterCount.set(chapters.length);
        });
        
        return () => subscription.unsubscribe();
      } else {
        this.activeRunChapterCount.set(0);
        return undefined;
      }
    });
  }

  async loadActiveRun(mangaId: number) {
    const runs = await this.runService.getRunsForMedia(mangaId);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    this.activeRun.set(lastRun);
  }

  get activeRunRating(): number {
    return this.activeRun()?.rating || 0;
  }


  async ngOnInit() {
    this.categoryService.getAllCategories$().subscribe(cats => {
      this.categories.set(cats);
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

  async loadData(id: number) {
    this.isLoading.set(true);
    
    try {
      const mangaData = await this.mangaService.getMangaById(id);
      if (mangaData) {
        const metadata = await this.mangaService.getMangaMetadata(id);
        this.manga.set({ ...mangaData, metadata });
        
        if (mangaData.statusId) {
          const cat = await this.categoryService.getCategoryById(mangaData.statusId);
          this.category.set(cat || null);
        }

        this.listService.getListsContainingItem$(id).pipe(take(1)).subscribe((listsData: List[]) => {
            this.lists.set(listsData);
        });
      } else {
        this.router.navigate(['/404']);
      }
    } catch (error) {
      console.error('Error loading manga details:', error);
      this.router.navigate(['/404']);
    } finally {
      this.isLoading.set(false);
    }
  }

  onEdit() {
    const currentManga = this.manga();
    if (currentManga) {
      this.dialogService.openEditManga(currentManga);
    }
  }

  onHoverScore(score: number | null) {
    this.hoveredScore.set(score);
  }

  getScoreLabel(score: number): string {
    const labels = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great', 'Masterpiece'];
    return labels[score] || '';
  }

  async onUpdateScore(score: number) {
    const run = this.activeRun();
    if (run?.id) {
      this.activeRun.set({ ...run, rating: score });
      await this.runService.updateRun(run.id, { rating: score });
    }
  }

  async onUpdateCategory(statusId: number) {
    const currentManga = this.manga();
    if (!currentManga || !currentManga.id) return;

    await this.mangaService.updateManga(currentManga.id, { statusId });
    const cat = await this.categoryService.getCategoryById(statusId);
    this.category.set(cat || null);
    this.manga.update(m => m ? { ...m, statusId } : null);
  }

  onListUpdated() {
    const id = this.manga()?.id;
    if (id) {
      this.listService.getListsContainingItem$(id).pipe(take(1)).subscribe((listsData: List[]) => {
        this.lists.set(listsData);
      });
    }
  }

  getProgress(): number {
    const manga = this.manga();
    if (!manga || !manga.progressTotal) return 0;
    const current = this.activeRunChapterCount();
    return Math.min(100, Math.round((current / manga.progressTotal) * 100));
  }

  async incrementChapter() {
    const run = this.activeRun();
    if (!run?.id) return;

    // Optimistic update
    const currentCount = this.activeRunChapterCount();
    const total = this.manga()?.progressTotal;
    if (total && currentCount >= total) return;
    
    this.activeRunChapterCount.set(currentCount + 1);

    try {
      await this.progressService.markNextChapterRead(run.id);
    } catch (error) {
      // Rollback on error
      this.activeRunChapterCount.set(currentCount);
      console.error('Failed to increment chapter:', error);
    }
  }

  async decrementChapter() {
    const run = this.activeRun();
    if (!run?.id) return;

    // Optimistic update
    const currentCount = this.activeRunChapterCount();
    if (currentCount <= 0) return;
    
    this.activeRunChapterCount.set(currentCount - 1);

    try {
      await this.progressService.removeLastChapterRead(run.id);
    } catch (error) {
      // Rollback on error
      this.activeRunChapterCount.set(currentCount);
      console.error('Failed to decrement chapter:', error);
    }
  }


  async completeChapters() {
    const manga = this.manga();
    const run = this.activeRun();
    if (!run?.id || !manga?.progressTotal) return;

    // Optimistic update
    this.activeRunChapterCount.set(manga.progressTotal);

    try {
      await this.progressService.markChapterRangeRead(run.id, 1, manga.progressTotal);
    } catch (error) {
      console.error('Failed to complete chapters:', error);
      // Actual state will be synced by the effect
    }
  }

  async resetChapters() {
    const run = this.activeRun();
    if (!run?.id) return;

    // Optimistic update
    this.activeRunChapterCount.set(0);

    try {
      await this.progressService.clearProgress(run.id);
    } catch (error) {
      console.error('Failed to reset chapters:', error);
    }
  }
}

