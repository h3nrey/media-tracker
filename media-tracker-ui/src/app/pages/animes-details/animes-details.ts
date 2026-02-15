import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { ListService } from '../../services/list.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { List } from '../../models/list.model';
import { MediaRunService } from '../../services/media-run.service';
import { EpisodeProgressService } from '../../services/episode-progress.service';
import { take, Subscription } from 'rxjs';

import { MediaRunsListComponent } from '../../components/media-runs/media-runs-list.component';
import { AnimeLinksComponent } from './components/anime-links/anime-links.component';
import { AnimeDetails, AnimeSidebarComponent } from './components/anime-sidebar/anime-sidebar.component';
import { AnimeInfoComponent } from './components/anime-info/anime-info.component';
import { MediaReviewsComponent } from '../../components/media-reviews/media-reviews.component';
import { MediaListSectionComponent } from '../../components/media-list-section/media-list-section.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-animes-details',
  standalone: true,
  imports: [
    CommonModule,
    MediaRunsListComponent,
    AnimeSidebarComponent,
    AnimeInfoComponent,
    MediaReviewsComponent,
    LucideAngularModule
  ],
  templateUrl: './animes-details.html',
  styleUrl: './animes-details.scss',
})
export class AnimesDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);
  private listService = inject(ListService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private runService = inject(MediaRunService);
  private progressService = inject(EpisodeProgressService);
  private router = inject(Router);

  anime = signal<AnimeDetails | null>(null);
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

  loadData(id: number) {
    this.isLoading.set(true);
    
    this.sub.add(
      this.animeService.getAnimeById$(id).subscribe(async animeData => {
        if (animeData) {
          this.anime.set(animeData as AnimeDetails);
          
          if (animeData.statusId) {
            const cat = await this.categoryService.getCategoryById(animeData.statusId);
            this.category.set(cat || null);
          }

          this.listService.getListsContainingItem$(id).pipe(take(1)).subscribe((listsData: List[]) => {
              this.lists.set(listsData);
          });
        } else {
          // If no data found, redirect to 404
          this.router.navigate(['/404']);
        }
        this.isLoading.set(false);
      })
    );
  }

  async incrementEpisode() {
    const currentAnime = this.anime();
    if (!currentAnime?.id) return;

    // Get last run
    const runs = await this.runService.getRunsForMedia(currentAnime.id);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    if (!lastRun?.id) return;

    await this.progressService.markNextEpisodeWatched(lastRun.id);
    
    // We don't do optimistic update here because the signals are in the sidebar component
    // But the service call is now much faster.
  }

  async decrementEpisode() {
    const currentAnime = this.anime();
    if (!currentAnime?.id) return;

    const runs = await this.runService.getRunsForMedia(currentAnime.id);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    if (!lastRun?.id) return;

    await this.progressService.removeLastEpisodeWatched(lastRun.id);
  }


  async resetEpisodes() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    // Get last run and clear its progress
    const runs = await this.runService.getRunsForMedia(currentAnime.id);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    if (lastRun?.id) {
      await this.progressService.clearProgress(lastRun.id);
    }
  }

  async completeEpisodes() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const total = currentAnime.progressTotal;
    if (!total) return;

    // Get last run (active or most recent completed)
    const runs = await this.runService.getRunsForMedia(currentAnime.id);
    const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
    if (!lastRun?.id) return;

    // Get current episode count
    const episodes = await this.progressService.getEpisodesForRun(lastRun.id);
    const current = episodes.length;

    if (current !== total) {
      // Mark all episodes as watched
      const allEpisodes = Array.from({ length: total }, (_, i) => i + 1);
      await this.progressService.markEpisodesWatched(lastRun.id, allEpisodes);

      this.toastService.success(`You've finished ${currentAnime.title}!`);
    }
  }

  getTagline() {
    const notes = this.anime()?.notes;
    if (!notes || notes.length < 15) return '';
    const firstSentence = notes.split(/[.!?]/)[0];
    // Only return as tagline if it's short and punchy (between 10 and 80 chars)
    return (firstSentence.length > 10 && firstSentence.length < 80) ? firstSentence.toUpperCase() : '';
  }

  onEdit() {
    const currentAnime = this.anime();
    if (currentAnime) {
      this.dialogService.openEditAnime(currentAnime);
    }
  }


  async onUpdateScore(score: number) {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    await this.animeService.updateAnime(currentAnime.id, { score });
    this.anime.update(a => a ? { ...a, score } : null);
  }

  async onSaveLinks(sourceLinks: any[]) {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    await this.animeService.updateAnime(currentAnime.id, { sourceLinks });
    this.anime.update(a => a ? { ...a, sourceLinks } : null);
  }

  async onUpdateCategory(statusId: number) {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    await this.animeService.updateAnime(currentAnime.id, { statusId });
    // Reload category object
    const cat = await this.categoryService.getCategoryById(statusId);
    this.category.set(cat || null);
    this.anime.update(a => a ? { ...a, statusId } : null);
  }

  onListUpdated() {
    const id = this.anime()?.id;
    if (id) {
      this.listService.getListsContainingItem$(id).pipe(take(1)).subscribe((listsData: List[]) => {
        this.lists.set(listsData);
      });
    }
  }
}
