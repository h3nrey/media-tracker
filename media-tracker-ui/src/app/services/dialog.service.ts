import { Injectable, signal } from '@angular/core';
import { Anime } from '../models/anime.model';
import { MediaItem } from '../models/media-type.model';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private addMediaVisible = signal(false);
  private editingMedia = signal<any | null>(null);
  private initialCategory = signal<number | undefined>(undefined);
  private selectedMedia = signal<any | null>(null);

  readonly isAddMediaOpen = this.addMediaVisible.asReadonly();
  readonly mediaToEdit = this.editingMedia.asReadonly();
  readonly categoryToSet = this.initialCategory.asReadonly();
  readonly mediaDetails = this.selectedMedia.asReadonly();

  openAddMedia(categoryId?: number) {
    this.editingMedia.set(null);
    this.initialCategory.set(categoryId);
    this.addMediaVisible.set(true);
  }

  // Legacy wrapper
  openAddAnime(categoryId?: number) {
    this.openAddMedia(categoryId);
  }

  openEditMedia(media: any) {
    this.editingMedia.set(media);
    this.initialCategory.set(undefined);
    this.addMediaVisible.set(true);
  }

  // Legacy wrapper
  openEditAnime(anime: any) {
    this.openEditMedia(anime);
  }

  openMediaDetails(media: any) {
    this.selectedMedia.set(media);
  }

  // Legacy wrapper
  openAnimeDetails(anime: Anime) {
    this.openMediaDetails(anime);
  }

  closeMediaDetails() {
    this.selectedMedia.set(null);
  }

  // Legacy wrapper
  closeAnimeDetails() {
    this.closeMediaDetails();
  }

  closeAddMedia() {
    this.addMediaVisible.set(false);
    this.editingMedia.set(null);
    this.initialCategory.set(undefined);
  }

  // Legacy wrapper
  closeAddAnime() {
    this.closeAddMedia();
  }
}
