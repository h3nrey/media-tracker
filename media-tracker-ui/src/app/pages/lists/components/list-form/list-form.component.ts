import { Component, signal, inject, Output, EventEmitter, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Search, Plus, Trash2 } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ListService } from '../../../../services/list.service';
import { MediaService } from '../../../../services/media.service';
import { MediaTypeStateService } from '../../../../services/media-type-state.service';
import { MalService } from '../../../../services/mal.service';
import { IgdbService, IGDBGame } from '../../../../services/igdb.service';
import { MediaItem, MediaType } from '../../../../models/media-type.model';
import { JikanAnime } from '../../../../models/mal-anime.model';
import { CategoryService } from '../../../../services/status.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, map, catchError, combineLatest as combineLatestRxjs } from 'rxjs';
import { Folder } from '../../../../models/list.model';

@Component({
  selector: 'app-list-form',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './list-form.component.html',
  styleUrl: './list-form.component.scss'
})
export class ListFormComponent implements OnDestroy {
  private listService = inject(ListService);
  private mediaService = inject(MediaService);
  private malService = inject(MalService);
  private igdbService = inject(IgdbService);
  private categoryService = inject(CategoryService);
  private mediaTypeState = inject(MediaTypeStateService);

  private searchSubject = new Subject<string>();
  apiResults = signal<any[]>([]);
  isSearching = signal(false);
  private searchSubscription: any;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  isOpen = signal(false);
  name = signal('');
  selectedFolderId = signal<number | undefined>(undefined);
  mediaTypeId = signal<number | null>(null);
  selectedMediaIds = signal<number[]>([]);
  editingListId = signal<number | undefined>(undefined);
  
  folders = signal<Folder[]>([]);
  allMedia = signal<MediaItem[]>([]);
  searchQuery = signal('');

  mediaTypeOptions = [
    { value: null, label: 'Universal (All)' },
    { value: MediaType.ANIME, label: 'Anime' },
    { value: MediaType.MANGA, label: 'Manga' },
    { value: MediaType.GAME, label: 'Games' },
    { value: MediaType.MOVIE, label: 'Movies' }
  ];

  readonly XIcon = X;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  constructor() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 3) return of([]);
        this.isSearching.set(true);
        
        return combineLatestRxjs([
          this.malService.searchAnime(query).pipe(catchError(() => of([]))),
          this.igdbService.searchGames(query).pipe(catchError(() => of([])))
        ]).pipe(
          map(([anime, games]) => {
            this.isSearching.set(false);
            return [
              ...anime.map(a => ({ ...a, _type: 'anime' })),
              ...games.map(g => ({ ...g, _type: 'game' }))
            ];
          })
        );
      })
    ).subscribe(results => {
      this.apiResults.set(results);
    });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  async open(list?: any, folderId?: number) {
    if (list) {
      this.editingListId.set(list.id);
      this.name.set(list.name);
      this.selectedFolderId.set(list.folderId);
      this.mediaTypeId.set(list.mediaTypeId || null);
      this.selectedMediaIds.set([...(list.mediaItemIds || list.animeIds || [])]);
    } else {
      this.editingListId.set(undefined);
      this.name.set('');
      this.selectedFolderId.set(folderId);
      this.mediaTypeId.set(this.mediaTypeState.getCurrentMediaType());
      this.selectedMediaIds.set([]);
    }
    
    this.searchQuery.set('');
    
    this.listService.getFolders$().subscribe(folders => {
      this.folders.set(folders);
    });
    
    this.mediaService.getAllMedia$().subscribe(media => {
      this.allMedia.set(media);
    });

    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeDialog() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.close.emit();
  }

  get filteredLocalMedia() {
    const query = this.searchQuery().toLowerCase();
    if (!query || query.length < 2) return [];
    return this.allMedia().filter(m => 
      m.title.toLowerCase().includes(query) && 
      !this.selectedMediaIds().includes(m.id!)
    ).slice(0, 5);
  }

  get filteredApiResults() {
    // Filter out API results that are already in our local collection
    return this.apiResults().filter(api => {
      if (api._type === 'anime') {
        const localExternalIds = this.allMedia().filter(m => m.mediaTypeId === MediaType.ANIME).map(m => m.externalId);
        return !localExternalIds.includes(api.mal_id);
      } else {
        const localExternalIds = this.allMedia().filter(m => m.mediaTypeId === MediaType.GAME).map(m => m.externalId);
        return !localExternalIds.includes(api.id);
      }
    });
  }

  async addMediaFromApi(apiItem: any) {
    const categories = await this.categoryService.getAllCategories();
    const backlogCat = categories.find(c => c.name.toLowerCase().includes('plan') || c.name.toLowerCase().includes('backlog')) || categories[0];
    
    let mediaItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>;
    let id: number;

    if (apiItem._type === 'anime') {
      mediaItem = this.malService.convertJikanToAnime(apiItem as JikanAnime, backlogCat.id!);
      id = await this.mediaService.addMedia({ ...mediaItem, externalId: (apiItem as JikanAnime).mal_id, externalApi: 'mal' });
    } else {
      mediaItem = this.igdbService.convertIGDBToMediaItem(apiItem as IGDBGame, backlogCat.id!);
      id = await this.mediaService.addMedia(mediaItem);
      const metadata = {
        mediaItemId: id,
        developers: apiItem.involved_companies?.filter((c: any) => c.developer).map((c: any) => c.company.name) || [],
        publishers: apiItem.involved_companies?.filter((c: any) => c.publisher).map((c: any) => c.company.name) || [],
        platforms: apiItem.platforms?.map((p: any) => p.name) || [],
        igdbId: apiItem.id
      };
      await this.mediaService.saveGameMetadata(metadata);
    }
    
    this.addMedia(id);
    this.apiResults.set([]);
    this.searchQuery.set('');
  }

  selectedAnimes = computed(() => {
    const ids = this.selectedMediaIds();
    return this.allMedia().filter(m => ids.includes(m.id!) && m.mediaTypeId === 1);
  });

  selectedGames = computed(() => {
    const ids = this.selectedMediaIds();
    return this.allMedia().filter(m => ids.includes(m.id!) && m.mediaTypeId === 3);
  });

  get totalSelectedCount(): number {
    return this.selectedMediaIds().length;
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  addMedia(id: number) {
    this.selectedMediaIds.update(ids => [...ids, id]);
    this.searchQuery.set('');
  }

  removeMedia(id: number) {
    this.selectedMediaIds.update(ids => ids.filter(i => i !== id));
  }

  async save() {
    if (!this.name()) return;

    if (this.editingListId()) {
      await this.listService.updateList(this.editingListId()!, {
        name: this.name(),
        folderId: this.selectedFolderId(),
        mediaTypeId: this.mediaTypeId(),
        mediaItemIds: this.selectedMediaIds(),
        animeIds: this.selectedMediaIds(), // Keep for compatibility
      });
    } else {
      await this.listService.addList({
        name: this.name(),
        folderId: this.selectedFolderId(),
        mediaTypeId: this.mediaTypeId(),
        mediaItemIds: this.selectedMediaIds(),
        animeIds: this.selectedMediaIds(), // Keep for compatibility
      });
    }

    this.saved.emit();
    this.closeDialog();
  }
}
