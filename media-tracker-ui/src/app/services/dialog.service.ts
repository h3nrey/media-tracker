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
  
  // Media Run Dialogs
  private addRunVisible = signal(false);
  private addRunData = signal<{ mediaItemId: number, mediaType: any, totalCount: number } | null>(null);
  
  private runDetailsVisible = signal(false);
  private runDetailsRun = signal<any | null>(null);
  private runDetailsMediaType = signal<any | null>(null);
  private runDetailsTotalCount = signal<number>(0);

  readonly isAddMediaOpen = this.addMediaVisible.asReadonly();
  readonly mediaToEdit = this.editingMedia.asReadonly();
  readonly categoryToSet = this.initialCategory.asReadonly();
  readonly mediaDetails = this.selectedMedia.asReadonly();

  readonly isAddRunOpen = this.addRunVisible.asReadonly();
  readonly currentAddRunData = this.addRunData.asReadonly();

  readonly isRunDetailsOpen = this.runDetailsVisible.asReadonly();
  readonly currentRunDetails = this.runDetailsRun.asReadonly();
  readonly currentRunMediaType = this.runDetailsMediaType.asReadonly();
  readonly currentRunTotalCount = this.runDetailsTotalCount.asReadonly();

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

  // Explicit wrappers for clarity
  openEditAnime(anime: any) {
    this.openEditMedia(anime);
  }

  openEditMovie(movie: any) {
    this.openEditMedia(movie);
  }

  openEditManga(manga: any) {
    this.openEditMedia(manga);
  }

  openEditGame(game: any) {
    this.openEditMedia(game);
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

  // Media Run Dialog Methods
  openAddRun(mediaItemId: number, mediaType: any, totalCount: number) {
    this.addRunData.set({ mediaItemId, mediaType, totalCount });
    this.addRunVisible.set(true);
  }

  closeAddRun() {
    this.addRunVisible.set(false);
    this.addRunData.set(null);
  }

  openRunDetails(run: any, mediaType: any, totalCount: number) {
    this.runDetailsRun.set(run);
    this.runDetailsMediaType.set(mediaType);
    this.runDetailsTotalCount.set(totalCount);
    this.runDetailsVisible.set(true);
  }

  closeRunDetails() {
    this.runDetailsVisible.set(false);
    this.runDetailsRun.set(null);
  }

  updateSelectedRun(run: any) {
    if (this.runDetailsVisible() && this.runDetailsRun()?.id === run.id) {
      this.runDetailsRun.set(run);
    }
  }
}
