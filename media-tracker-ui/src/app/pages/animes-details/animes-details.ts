import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { ListService } from '../../services/list.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { List } from '../../models/list.model';
import { take, Subscription } from 'rxjs';

import { AnimeListsComponent } from './components/anime-lists/anime-lists.component';
import { AnimeHistoryComponent } from './components/anime-history/anime-history.component';
import { AnimeLinksComponent } from './components/anime-links/anime-links.component';
import { AnimeDetails, AnimeSidebarComponent } from './components/anime-sidebar/anime-sidebar.component';
import { AnimeInfoComponent } from './components/anime-info/anime-info.component';
import { AnimeReviewsComponent } from '../../components/anime-reviews/anime-reviews.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-animes-details',
  standalone: true,
  imports: [
    CommonModule,
    AnimeListsComponent,
    AnimeHistoryComponent,
    AnimeSidebarComponent,
    AnimeInfoComponent,
    AnimeReviewsComponent,
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

  anime = signal<AnimeDetails | null>(null);
  category = signal<Category | null>(null);
  lists = signal<List[]>([]);
  isLoading = signal(true);
  private sub = new Subscription();

  async ngOnInit() {
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

          this.listService.getListsContainingAnime$(id).pipe(take(1)).subscribe(listsData => {
              this.lists.set(listsData);
          });
        }
        this.isLoading.set(false);
      })
    );
  }

  async incrementEpisode() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const current = currentAnime.progressCurrent || 0;
    const total = currentAnime.progressTotal;

    if (!total || current < total) {
      const newCount = current + 1;
      await this.animeService.updateAnime(currentAnime.id, {
        progressCurrent: newCount
      });
      this.anime.update(a => a ? { ...a, progressCurrent: newCount } : null);
      
      if (total && newCount === total) {
        this.toastService.success(`You've finished ${currentAnime.title}!`, {
          label: 'Log Date',
          action: () => this.onAddLog()
        });
      }
    }
  }

  async decrementEpisode() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const current = currentAnime.progressCurrent || 0;
    if (current > 0) {
      const newCount = current - 1;
      await this.animeService.updateAnime(currentAnime.id, {
        progressCurrent: newCount
      });
      this.anime.update(a => a ? { ...a, progressCurrent: newCount } : null);
    }
  }

  async resetEpisodes() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    await this.animeService.updateAnime(currentAnime.id, {
      progressCurrent: 0
    });
    this.anime.update(a => a ? { ...a, progressCurrent: 0 } : null);
  }

  async completeEpisodes() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const total = currentAnime.progressTotal;
    if (total && currentAnime.progressCurrent !== total) {
      await this.animeService.updateAnime(currentAnime.id, {
        progressCurrent: total
      });
      this.anime.update(a => a ? { ...a, progressCurrent: total } : null);

      this.toastService.success(`You've finished ${currentAnime.title}!`, {
        label: 'Log Date',
        action: () => this.onAddLog()
      });
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

  async onAddLog() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const activityDates = [...(currentAnime.activityDates || []), new Date()];
    await this.animeService.updateAnime(currentAnime.id, { activityDates });
    this.anime.update(a => a ? { ...a, activityDates } : null);
  }

  async onRemoveLog(index: number) {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id || !currentAnime.activityDates) return;

    const activityDates = [...currentAnime.activityDates];
    activityDates.splice(index, 1);
    
    await this.animeService.updateAnime(currentAnime.id, { activityDates });
    this.anime.update(a => a ? { ...a, activityDates } : null);
  }

  async onUpdateLog(event: { index: number, date: Date }) {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id || !currentAnime.activityDates) return;

    const activityDates = [...currentAnime.activityDates];
    activityDates[event.index] = event.date;

    await this.animeService.updateAnime(currentAnime.id, { activityDates });
    this.anime.update(a => a ? { ...a, activityDates } : null);
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
}
