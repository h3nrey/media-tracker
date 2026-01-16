import { Component, signal, inject, Output, EventEmitter, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Search, Plus, Trash2, Save } from 'lucide-angular';
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
import { SelectComponent } from '../../../../components/ui/select/select';

@Component({
  selector: 'app-list-form',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, SelectComponent],
  templateUrl: './list-form.component.html',
  styleUrl: './list-form.component.scss'
})
export class ListFormComponent implements OnDestroy {
  private mediaService = inject(MediaService);
  private mediaTypeState = inject(MediaTypeStateService);
  private listService = inject(ListService);

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
  folderOptions = computed(() => [
    { value: undefined, label: 'No Folder' },
    ...this.folders().map(f => ({ value: f.id, label: f.name }))
  ]);
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
  readonly SaveIcon = Save;
  readonly CloseIcon = X;

  hovering = signal(false);

  constructor() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(query => {
        this.isSearching.set(true);
        return this.mediaService.searchExternalApi(query, this.mediaTypeId()).pipe(
          map(results => {
            this.isSearching.set(false);
            return results;
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
    return this.mediaService.filterLocalMedia(
      this.searchQuery(),
      this.mediaTypeId(),
      this.allMedia(),
      this.selectedMediaIds()
    );
  }

  get filteredApiResults() {
    return this.mediaService.filterApiResults(
      this.apiResults(),
      this.allMedia()
    );
  }

  async addMediaFromApi(apiItem: any) {
    const id = await this.mediaService.importMediaFromApi(apiItem);
    this.addMedia(id);
    this.apiResults.set([]);
    this.searchQuery.set('');
  }

  selectedMediaItems = computed(() => {
    const ids = this.selectedMediaIds();
    const type = this.mediaTypeId();
    return this.allMedia().filter(m => 
      ids.includes(m.id!) && 
      (!type || m.mediaTypeId === type)
    );
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

    await this.listService.saveList(this.editingListId(), {
      name: this.name(),
      folderId: this.selectedFolderId(),
      mediaTypeId: this.mediaTypeId(),
      mediaItemIds: this.selectedMediaIds()
    });

    this.saved.emit();
    this.closeDialog();
  }
}
