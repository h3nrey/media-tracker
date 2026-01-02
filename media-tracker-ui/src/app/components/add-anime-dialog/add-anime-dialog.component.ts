import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { JikanAnime } from '../../models/mal-anime.model';
import { MalService } from '../../services/mal.service';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';
import { Anime } from '../../models/anime.model';
import { NumberInputComponent } from '../ui/number-input/number-input.component';
import { TagInputComponent } from '../ui/tag-input/tag-input.component';
import { LucideAngularModule, CheckCircle, X } from 'lucide-angular';

@Component({
  selector: 'app-add-anime-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NumberInputComponent, TagInputComponent],
  templateUrl: './add-anime-dialog.component.html',
  styleUrl: './add-anime-dialog.component.scss'
})
export class AddAnimeDialogComponent {
  readonly CheckCircleIcon = CheckCircle;
  readonly XIcon = X;
  searchQuery = signal('');
  searchResults = signal<JikanAnime[]>([]);
  isSearching = signal(false);
  private searchSubject = new Subject<string>();

  selectedAnime = signal<JikanAnime | null>(null);
  manualMode = signal(false);
  editMode = signal(false);
  editingId = signal<number | null>(null);
  
  title = signal('');
  coverImage = signal('');
  malId = signal<number | undefined>(undefined);
  episodesWatched = signal(0);
  totalEpisodes = signal(0);
  selectedCategoryId = signal<number>(1);
  score = signal(0);
  genres = signal<string[]>([]);
  studios = signal<string[]>([]);
  releaseYear = signal<number | undefined>(undefined);
  notes = signal('');
  watchDates = signal<Date[]>([]);
  newWatchDate = signal<string>(new Date().toISOString().split('T')[0]);

  categories = signal<Category[]>([]);

  isOpen = signal(false);
  isSaving = signal(false);

  dialogTitle = computed(() => this.editMode() ? 'Edit Anime' : 'Add Anime');

  constructor(
    private malService: MalService,
    private animeService: AnimeService,
    private categoryService: CategoryService
  ) {
    this.initializeSearch();
    this.loadCategories();
  }

  private initializeSearch() {
    this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.trim().length < 2) {
            return [];
          }
          this.isSearching.set(true);
          return this.malService.searchAnime(query, 8);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.isSearching.set(false);
        },
        error: (error) => {
          console.error('Search error:', error);
          this.isSearching.set(false);
        }
      });
  }

  private async loadCategories() {
    const categories = await this.categoryService.getAllCategories();
    this.categories.set(categories);
    if (categories.length > 0 && categories[0].id) {
      if (!this.editMode()) {
        this.selectedCategoryId.set(categories[0].id);
      }
    }
  }

  open() {
    this.isOpen.set(true);
    this.resetForm();
    if (this.categories().length > 0 && this.categories()[0].id) {
      this.selectedCategoryId.set(this.categories()[0].id!);
    }
  }

  openWithCategory(categoryId: number) {
    this.isOpen.set(true);
    this.resetForm();
    this.selectedCategoryId.set(categoryId);
  }

  openForEdit(anime: Anime) {
    this.isOpen.set(true);
    this.resetForm();
    this.editMode.set(true);
    this.manualMode.set(true);
    this.editingId.set(anime.id!);

    this.title.set(anime.title);
    this.coverImage.set(anime.coverImage || '');
    this.malId.set(anime.malId);
    this.episodesWatched.set(anime.episodesWatched);
    this.totalEpisodes.set(anime.totalEpisodes || 0);
    this.selectedCategoryId.set(anime.statusId);
    this.score.set(anime.score);
    this.genres.set(anime.genres);
    this.studios.set(anime.studios || []);
    this.releaseYear.set(anime.releaseYear);
    this.notes.set(anime.notes || '');
    this.watchDates.set(anime.watchDates || []);
  }

  close() {
    this.isOpen.set(false);
    this.resetForm();
  }

  onSearchInput(query: string) {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  selectAnime(anime: JikanAnime) {
    this.selectedAnime.set(anime);
    this.manualMode.set(false);
    
    this.title.set(anime.title_english || anime.title);
    this.coverImage.set(anime.images.webp.large_image_url || anime.images.jpg.large_image_url);
    this.malId.set(anime.mal_id);
    this.totalEpisodes.set(anime.episodes || 0);
    
    // Combine genres, themes, and demographics
    const combinedGenres = [
      ...(anime.genres?.map(g => g.name) || []),
      ...(anime.themes?.map(t => t.name) || []),
      ...(anime.demographics?.map(d => d.name) || [])
    ];
    // Unique values
    this.genres.set([...new Set(combinedGenres)]);

    this.studios.set(anime.studios?.map(s => s.name) || []);
    
    this.releaseYear.set(anime.year || anime.aired?.prop?.from?.year);
    
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  enableManualMode() {
    this.manualMode.set(true);
    this.selectedAnime.set(null);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  markAsComplete() {
    if (this.totalEpisodes() > 0) {
      this.episodesWatched.set(this.totalEpisodes());
    }
  }

  addDate() {
    if (this.newWatchDate()) {
      const date = new Date(this.newWatchDate());
      this.watchDates.update(dates => [...dates, date]);
    }
  }

  removeDate(index: number) {
    this.watchDates.update(dates => dates.filter((_, i) => i !== index));
  }

  async save() {
    if (!this.title().trim()) {
      alert('Title is required');
      return;
    }

    this.isSaving.set(true);

    try {
      const animeData = {
        title: this.title(),
        coverImage: this.coverImage(),
        malId: this.malId(),
        episodesWatched: this.episodesWatched(),
        totalEpisodes: this.totalEpisodes(),
        statusId: this.selectedCategoryId(),
        score: this.score(),
        genres: this.genres(),
        studios: this.studios(),
        releaseYear: this.releaseYear(),
        notes: this.notes(),
        watchDates: this.watchDates()
      };

      if (this.editMode() && this.editingId()) {
        await this.animeService.updateAnime(this.editingId()!, animeData);
      } else {
        await this.animeService.addAnime(animeData);
      }

      this.close();
    } catch (error) {
      console.error('Error saving anime:', error);
      alert('Failed to save anime');
    } finally {
      this.isSaving.set(false);
    }
  }

  private resetForm() {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.selectedAnime.set(null);
    this.manualMode.set(false);
    this.editMode.set(false);
    this.editingId.set(null);
    
    this.title.set('');
    this.coverImage.set('');
    this.malId.set(undefined);
    this.episodesWatched.set(0);
    this.totalEpisodes.set(0);
    this.score.set(0);
    this.genres.set([]);
    this.studios.set([]);
    this.releaseYear.set(undefined);
    this.notes.set('');
    this.watchDates.set([]);
    this.newWatchDate.set(new Date().toISOString().split('T')[0]);
    
    if (this.categories().length > 0 && this.categories()[0].id) {
        this.selectedCategoryId.set(this.categories()[0].id!);
    }
  }

  onGenresInput(value: string) {
    this.genres.set(value.split(',').map(g => g.trim()).filter(g => g));
  }
}
