import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { JikanAnime } from '../../models/mal-anime.model';
import { MalService } from '../../services/mal.service';
import { AnimeService } from '../../services/anime.service';
import { CategoryService } from '../../services/status.service';
import { Category } from '../../models/status.model';

@Component({
  selector: 'app-add-anime-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-anime-dialog.component.html',
  styleUrl: './add-anime-dialog.component.scss'
})
export class AddAnimeDialogComponent {
  searchQuery = signal('');
  searchResults = signal<JikanAnime[]>([]);
  isSearching = signal(false);
  private searchSubject = new Subject<string>();

  selectedAnime = signal<JikanAnime | null>(null);
  manualMode = signal(false);
  
  title = signal('');
  coverImage = signal('');
  malId = signal<number | undefined>(undefined);
  episodesWatched = signal(0);
  totalEpisodes = signal(0);
  selectedCategoryId = signal<number>(1);
  score = signal(0);
  genres = signal<string[]>([]);
  releaseYear = signal<number | undefined>(undefined);
  notes = signal('');

  categories = signal<Category[]>([]);

  isOpen = signal(false);
  isSaving = signal(false);

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
      this.selectedCategoryId.set(categories[0].id);
    }
  }

  open() {
    this.isOpen.set(true);
    this.resetForm();
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
    this.genres.set(anime.genres?.map(g => g.name) || []);
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

  async save() {
    if (!this.title().trim()) {
      alert('Title is required');
      return;
    }

    this.isSaving.set(true);

    try {
      await this.animeService.addAnime({
        title: this.title(),
        coverImage: this.coverImage(),
        malId: this.malId(),
        episodesWatched: this.episodesWatched(),
        totalEpisodes: this.totalEpisodes(),
        statusId: this.selectedCategoryId(),
        score: this.score(),
        genres: this.genres(),
        releaseYear: this.releaseYear(),
        notes: this.notes()
      });

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
    this.title.set('');
    this.coverImage.set('');
    this.malId.set(undefined);
    this.episodesWatched.set(0);
    this.totalEpisodes.set(0);
    this.score.set(0);
    this.genres.set([]);
    this.releaseYear.set(undefined);
    this.notes.set('');
  }

  onGenresInput(value: string) {
    this.genres.set(value.split(',').map(g => g.trim()).filter(g => g));
  }
}
