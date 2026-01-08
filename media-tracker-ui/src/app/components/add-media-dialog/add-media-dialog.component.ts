import { Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MalService } from '../../services/mal.service';
import { MediaService } from '../../services/media.service';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { MediaType } from '../../models/media-type.model';
import { IgdbService } from '../../services/igdb.service';
import { DialogService } from '../../services/dialog.service';
import { CategoryService } from '../../services/status.service';
import { WatchSourceService } from '../../services/watch-source.service';
import { WatchSource } from '../../models/watch-source.model';
import { Category } from '../../models/status.model';
import { LucideAngularModule, X, Search, Plus, Play, BookOpen, Gamepad2, Film } from 'lucide-angular';

// Import New Form Components
import { AnimeFormComponent } from './forms/anime-form/anime-form.component';
import { MangaFormComponent } from './forms/manga-form/manga-form.component';
import { GameFormComponent } from './forms/game-form/game-form.component';
import { MovieFormComponent } from './forms/movie-form/movie-form.component';

@Component({
  selector: 'app-add-media-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    AnimeFormComponent, 
    MangaFormComponent, 
    GameFormComponent, 
    MovieFormComponent
  ],
  templateUrl: './add-media-dialog.component.html',
  styleUrl: './add-media-dialog.component.scss'
})
export class AddMediaDialogComponent {
  // Icons
  readonly XIcon = X;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;
  readonly BookIcon = BookOpen;
  readonly GameIcon = Gamepad2;
  readonly FilmIcon = Film;
  
  // State
  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  isSearching = signal(false);
  private searchSubject = new Subject<string>();

  selectedMediaApiResult = signal<any | null>(null);
  initialFormData = signal<any | null>(null);
  
  manualMode = signal(false);
  editMode = signal(false);
  editingId = signal<number | null>(null);
  isSaving = signal(false);

  categories = signal<Category[]>([]);
  sources = signal<WatchSource[]>([]);

  // Services
  private malService = inject(MalService);
  private mediaService = inject(MediaService);
  private mediaTypeState = inject(MediaTypeStateService);
  private categoryService = inject(CategoryService);
  private watchSourceService = inject(WatchSourceService);
  private dialogService = inject(DialogService);
  private igdbService = inject(IgdbService);

  isOpen = this.dialogService.isAddMediaOpen;
  selectedMediaType = signal<number>(MediaType.ANIME);

  constructor() {
    this.initializeSearch();
    this.loadCategories();
    this.loadSources();

    effect(() => {
      const isOpen = this.dialogService.isAddMediaOpen();
      const mediaToEdit = this.dialogService.mediaToEdit();
      const categoryToSet = this.dialogService.categoryToSet();
      const globalMediaType = this.mediaTypeState.getCurrentMediaType();

      if (isOpen) {
        document.body.style.overflow = 'hidden';
        if (mediaToEdit) {
          this.initializeEdit(mediaToEdit);
        } else {
          this.resetForm();
          this.selectedMediaType.set(globalMediaType || MediaType.ANIME);
          if (categoryToSet !== undefined) {
            console.log("category to set",  categoryToSet)
            this.initialFormData.set({ statusId: categoryToSet });
          }
        }
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  private initializeEdit(media: any) {
    this.resetForm();
    this.editMode.set(true);
    this.manualMode.set(true);
    this.editingId.set(media.id!);
    this.selectedMediaType.set(media.mediaTypeId);
    console.log("media", media);
    this.initialFormData.set(media);
  }

  private initializeSearch() {
    this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.trim().length < 2) return of([]);
          this.isSearching.set(true);
          const type = this.selectedMediaType();
          switch(type) {
            case MediaType.ANIME: return this.malService.searchAnime(query, 8);
            case MediaType.MANGA: return this.malService.searchManga(query, 8);
            case MediaType.GAME: return this.igdbService.searchGames(query, 8);
            default: return of([]);
          }
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
  }

  private loadSources() {
    this.watchSourceService.getAllSources$().subscribe(sources => this.sources.set(sources));
  }

  close() {
    this.dialogService.closeAddMedia();
  }

  onSearchInput(query: string) {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  async selectMediaFromApi(result: any) {
    this.selectedMediaApiResult.set(result);
    this.manualMode.set(true);
    console.log("result", result);
    console.log("categories", this.categories());
    
    const type = this.selectedMediaType();
    let mappedData: any = {};
    const categoryId = this.categories()[0].supabaseId || 26;

    if (type === MediaType.GAME) {
      mappedData = this.igdbService.convertIGDBToMediaItem(result, categoryId);
    } else {
      // Anime/Manga from MAL
      mappedData = {
        title: result.title_english || result.title,
        coverImage: result.images?.webp?.large_image_url || result.images?.jpg?.large_image_url,
        externalId: result.mal_id,
        statusId: this.categories()[0].supabaseId
      };
      
      if (type === MediaType.ANIME) {
        mappedData.progress_total = result.episodes || 0;
        mappedData.trailerUrl = result.trailer?.embed_url || '';
        mappedData.studios = result.studios?.map((s: any) => s.name) || [];
        mappedData.releaseYear = result.year || result.aired?.prop?.from?.year;
        
        const banner = await this.malService.getBannerFromAnilist(result.mal_id);
        if (banner) mappedData.bannerImage = banner;
      } else {
        mappedData.progress_total = result.chapters || 0;
        mappedData.studios = result.authors?.map((a: any) => a.name) || [];
        mappedData.releaseYear = result.published?.prop?.from?.year;
      }

      const combinedGenres = [
        ...(result.genres?.map((g: any) => g.name) || []),
        ...(result.themes?.map((t: any) => t.name) || []),
        ...(result.demographics?.map((d: any) => d.name) || [])
      ];
      mappedData.genres = [...new Set(combinedGenres)];
    }
    
    console.log("mapped data", mappedData);
    this.initialFormData.set(mappedData);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  enableManualMode() {
    this.manualMode.set(true);
    this.selectedMediaApiResult.set(null);
    this.initialFormData.set({});
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  async onSave(mediaData: any) {
    this.isSaving.set(true);
    try {
      mediaData.externalApi = this.selectedMediaType() === MediaType.GAME ? 'igdb' : 'mal';
      
      console.log("save media data")
      console.log(mediaData);
      let mediaId: number;
      if (this.editMode() && this.editingId()) {
        await this.mediaService.updateMedia(this.editingId()!, mediaData);
        mediaId = this.editingId()!;
      } else {
        mediaId = await this.mediaService.addMedia(mediaData);
      }

      await this.saveMetadata(mediaId, mediaData);
      this.close();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async saveMetadata(mediaId: number, mediaData: any) {
    const type = this.selectedMediaType();
    if (type === MediaType.ANIME) {
      await this.mediaService.saveAnimeMetadata({
        mediaItemId: mediaId,
        malId: mediaData.externalId,
        studios: mediaData.studios
      });
    } else if (type === MediaType.MANGA) {
      await this.mediaService.saveMangaMetadata({
        mediaItemId: mediaId,
        malId: mediaData.externalId,
        authors: mediaData.studios,
        publishers: [],
        publicationStatus: ''
      });
    } else if (type === MediaType.GAME) {
      await this.mediaService.saveGameMetadata({
        mediaItemId: mediaId,
        igdbId: mediaData.externalId,
        developers: mediaData.studios || [],
        publishers: [],
        platforms: mediaData.platforms || []
      });
    }
  }

  private resetForm() {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.selectedMediaApiResult.set(null);
    this.initialFormData.set(null);
    this.manualMode.set(false);
    this.editMode.set(false);
    this.editingId.set(null);
  }

  // Common UI Computed
  dialogTitle = computed(() => {
    const type = this.selectedMediaType();
    const prefix = this.editMode() ? 'Edit' : 'Add';
    switch(type) {
      case MediaType.ANIME: return `${prefix} Anime`;
      case MediaType.MANGA: return `${prefix} Manga`;
      case MediaType.GAME: return `${prefix} Game`;
      case MediaType.MOVIE: return `${prefix} Movie`;
      default: return `${prefix} Media`;
    }
  });

  searchPlaceholder = computed(() => {
    const type = this.selectedMediaType();
    switch(type) {
      case MediaType.ANIME: return 'Search MyAnimeList...';
      case MediaType.MANGA: return 'Search Manga...';
      case MediaType.GAME: return 'Search IGDB...';
      default: return 'Search...';
    }
  });

  getResultTitle(media: any): string {
    return media.title || media.name || 'Unknown';
  }

  getResultCover(media: any): string {
    if (media.images?.webp?.small_image_url) return media.images.webp.small_image_url;
    if (media.cover?.url) {
      const url = media.cover.url.startsWith('//') ? `https:${media.cover.url}` : media.cover.url;
      return url.replace('t_thumb', 't_cover_small');
    }
    return '';
  }

  getResultMeta(media: any): string {
    const type = this.selectedMediaType();
    if (type === MediaType.ANIME || type === MediaType.MANGA) {
      return `${media.type || ''} • ${media.episodes || media.chapters || '?'} ${type === 1 ? 'eps' : 'ch'}`;
    }
    if (type === MediaType.GAME) {
      return media.platforms?.map((p: any) => p.name).slice(0, 2).join(', ') || 'Game';
    }
    return '';
  }

  getResultYear(media: any): string {
    if (media.year || media.published?.prop?.from?.year) return (media.year || media.published?.prop?.from?.year).toString();
    if (media.first_release_date) return new Date(media.first_release_date * 1000).getFullYear().toString();
    return '';
  }
}
