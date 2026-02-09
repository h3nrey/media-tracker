import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MovieService } from '../../services/movie.service';
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
import { MovieSidebarComponent, MovieDetails } from './components/movie-sidebar/movie-sidebar.component';
import { MovieInfoComponent } from './components/movie-info/movie-info.component';
import { MediaReviewsComponent } from '../../components/media-reviews/media-reviews.component';
import { MediaListSectionComponent } from '../../components/media-list-section/media-list-section.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-movies-details',
  standalone: true,
  imports: [
    CommonModule,
    MediaRunsListComponent,
    MovieSidebarComponent,
    MovieInfoComponent,
    MediaReviewsComponent,
    MediaListSectionComponent,
    LucideAngularModule
  ],
  templateUrl: './movies-details.html',
  styleUrl: './movies-details.scss',
})
export class MoviesDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private movieService = inject(MovieService);
  private categoryService = inject(CategoryService);
  private listService = inject(ListService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private runService = inject(MediaRunService);
  private router = inject(Router);

  movie = signal<MovieDetails | null>(null);
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
      this.movieService.getMovieById$(id).subscribe(async movieData => {
        if (movieData) {
          this.movie.set(movieData as MovieDetails);
          
          if (movieData.statusId) {
            const cat = await this.categoryService.getCategoryById(movieData.statusId);
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
    const notes = this.movie()?.notes;
    if (!notes || notes.length < 15) return '';
    const firstSentence = notes.split(/[.!?]/)[0];
    return (firstSentence.length > 10 && firstSentence.length < 80) ? firstSentence.toUpperCase() : '';
  }

  onEdit() {
    const currentMovie = this.movie();
    if (currentMovie) {
      this.dialogService.openEditMovie(currentMovie);
    }
  }

  async onUpdateScore(score: number) {
    const currentMovie = this.movie();
    if (!currentMovie || !currentMovie.id) return;

    await this.movieService.updateMovie(currentMovie.id, { score });
    this.movie.update(m => m ? { ...m, score } : null);
  }

  async onSaveLinks(sourceLinks: any[]) {
    const currentMovie = this.movie();
    if (!currentMovie || !currentMovie.id) return;

    await this.movieService.updateMovie(currentMovie.id, { sourceLinks });
    this.movie.update(m => m ? { ...m, sourceLinks } : null);
  }

  async onUpdateCategory(statusId: number) {
    const currentMovie = this.movie();
    if (!currentMovie || !currentMovie.id) return;

    await this.movieService.updateMovieStatus(currentMovie.id, statusId);
    const cat = await this.categoryService.getCategoryById(statusId);
    this.category.set(cat || null);
    this.movie.update(m => m ? { ...m, statusId } : null);
  }

  onListUpdated() {
    const id = this.movie()?.id;
    if (id) {
      this.listService.getListsContainingItem$(id).pipe(take(1)).subscribe((listsData: List[]) => {
        this.lists.set(listsData);
      });
    }
  }
}
