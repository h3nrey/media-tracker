import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
import { MediaRunService } from '../../services/media-run.service';
import { take, Subscription } from 'rxjs';

import { MediaRunsListComponent } from '../../components/media-runs/media-runs-list.component';
import { MediaReviewsComponent } from '../../components/media-reviews/media-reviews.component';
import { MediaListSectionComponent } from '../../components/media-list-section/media-list-section.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-manga-details',
  standalone: true,
  imports: [
    CommonModule,
    MediaRunsListComponent,
    MediaReviewsComponent,
    MediaListSectionComponent,
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
  private router = inject(Router);

  manga = signal<any | null>(null);
  category = signal<Category | null>(null);
  categories = signal<Category[]>([]);
  lists = signal<List[]>([]);
  isLoading = signal(true);
  private sub = new Subscription();

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

  async onUpdateScore(score: number) {
    const currentManga = this.manga();
    if (!currentManga || !currentManga.id) return;

    await this.mangaService.updateManga(currentManga.id, { score });
    this.manga.update(m => m ? { ...m, score } : null);
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

  async incrementChapter() {
    const currentManga = this.manga();
    if (!currentManga || !currentManga.id) return;

    const newProgress = (currentManga.progressCurrent || 0) + 1;
    if (currentManga.progressTotal && newProgress > currentManga.progressTotal) return;

    await this.mangaService.updateManga(currentManga.id, { progressCurrent: newProgress });
    this.manga.update(m => m ? { ...m, progressCurrent: newProgress } : null);
  }
}
