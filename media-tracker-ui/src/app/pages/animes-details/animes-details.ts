import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule, Star, Clock, Calendar, Hash, Tag, List as ListIcon, ChevronLeft, Play, ExternalLink, Edit2, Plus } from 'lucide-angular';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { ListService } from '../../services/list.service';
import { DialogService } from '../../services/dialog.service';
import { Anime } from '../../models/anime.model';
import { Category } from '../../models/status.model';
import { List } from '../../models/list.model';
import { take, Subscription } from 'rxjs';

@Component({
  selector: 'app-animes-details',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './animes-details.html',
  styleUrl: './animes-details.scss',
})
export class AnimesDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private animeService = inject(AnimeService);
  private categoryService = inject(CategoryService);
  private listService = inject(ListService);
  private dialogService = inject(DialogService);

  anime = signal<Anime | null>(null);
  category = signal<Category | null>(null);
  lists = signal<List[]>([]);
  isLoading = signal(true);
  private sub = new Subscription();

  // Icons
  readonly StarIcon = Star;
  readonly ClockIcon = Clock;
  readonly CalendarIcon = Calendar;
  readonly HashIcon = Hash;
  readonly TagIcon = Tag;
  readonly ListIcon = ListIcon;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly PlayIcon = Play;
  readonly ExternalLinkIcon = ExternalLink;
  readonly EditIcon = Edit2;
  readonly PlusIcon = Plus;

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
          this.anime.set(animeData);
          
          // Load category (could also be reactive but one-time is fine here if categories don't change often)
          if (animeData.statusId) {
            const cat = await this.categoryService.getCategoryById(animeData.statusId);
            this.category.set(cat || null);
          }

          // Load lists
          this.listService.getListsContainingAnime$(id).pipe(take(1)).subscribe(listsData => {
              this.lists.set(listsData);
          });
        }
        this.isLoading.set(false);
      })
    );
  }

  getScoreColor(score: number): string {
    if (score >= 8) return 'var(--app-success)';
    if (score >= 6) return 'var(--app-accent-yellow)';
    return 'var(--app-danger)';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  async incrementEpisode() {
    const currentAnime = this.anime();
    if (!currentAnime || !currentAnime.id) return;

    const current = currentAnime.episodesWatched || 0;
    const total = currentAnime.totalEpisodes;

    if (!total || current < total) {
      const newCount = current + 1;
      await this.animeService.updateAnime(currentAnime.id, {
        episodesWatched: newCount
      });
      this.anime.update(a => a ? { ...a, episodesWatched: newCount } : null);
    }
  }

  onEdit() {
    const currentAnime = this.anime();
    if (currentAnime) {
      this.dialogService.openEditAnime(currentAnime);
    }
  }
}
