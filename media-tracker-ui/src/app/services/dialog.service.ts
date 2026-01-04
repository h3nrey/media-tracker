import { Injectable, signal } from '@angular/core';
import { Anime } from '../models/anime.model';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private addAnimeVisible = signal(false);
  private editingAnime = signal<Anime | null>(null);
  private initialCategory = signal<number | undefined>(undefined);
  private selectedAnime = signal<Anime | null>(null);

  readonly isAddAnimeOpen = this.addAnimeVisible.asReadonly();
  readonly animeToEdit = this.editingAnime.asReadonly();
  readonly categoryToSet = this.initialCategory.asReadonly();
  readonly animeDetails = this.selectedAnime.asReadonly();

  openAddAnime(categoryId?: number) {
    this.editingAnime.set(null);
    this.initialCategory.set(categoryId);
    this.addAnimeVisible.set(true);
  }

  openEditAnime(anime: Anime) {
    this.editingAnime.set(anime);
    this.initialCategory.set(undefined);
    this.addAnimeVisible.set(true);
  }

  openAnimeDetails(anime: Anime) {
    this.selectedAnime.set(anime);
  }

  closeAnimeDetails() {
    this.selectedAnime.set(null);
  }

  closeAddAnime() {
    this.addAnimeVisible.set(false);
    this.editingAnime.set(null);
    this.initialCategory.set(undefined);
  }
}
