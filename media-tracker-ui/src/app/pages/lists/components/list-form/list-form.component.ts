import { Component, signal, inject, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Search, Plus, Trash2 } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ListService } from '../../../../services/list.service';
import { AnimeService } from '../../../../services/anime.service';
import { MalService } from '../../../../services/mal.service';
import { Anime } from '../../../../models/anime.model';
import { JikanAnime } from '../../../../models/mal-anime.model';
import { CategoryService } from '../../../../services/status.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, map, catchError } from 'rxjs';
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
  private animeService = inject(AnimeService);
  private malService = inject(MalService);
  private categoryService = inject(CategoryService);

  private searchSubject = new Subject<string>();
  apiResults = signal<any[]>([]);
  isSearching = signal(false);
  private searchSubscription: any;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  isOpen = signal(false);
  name = signal('');
  selectedFolderId = signal<number | undefined>(undefined);
  selectedAnimeIds = signal<number[]>([]);
  editingListId = signal<number | undefined>(undefined);
  
  folders = signal<Folder[]>([]);
  allAnime = signal<Anime[]>([]);
  searchQuery = signal('');

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
        return this.malService.searchAnime(query).pipe(
          catchError(() => of([])),
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
      this.selectedAnimeIds.set([...(list.animeIds || [])]);
    } else {
      this.editingListId.set(undefined);
      this.name.set('');
      this.selectedFolderId.set(folderId);
      this.selectedAnimeIds.set([]);
    }
    
    this.searchQuery.set('');
    
    // Explicitly fetch folders from the service
    this.listService.getFolders$().subscribe(folders => {
      this.folders.set(folders);
    });
    
    this.animeService.getAllAnime$().subscribe(anime => {
      this.allAnime.set(anime);
    });

    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeDialog() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.close.emit();
  }

  get filteredLocalAnime() {
    const query = this.searchQuery().toLowerCase();
    if (!query || query.length < 2) return [];
    return this.allAnime().filter(a => 
      a.title.toLowerCase().includes(query) && 
      !this.selectedAnimeIds().includes(a.id!)
    ).slice(0, 5);
  }

  get filteredApiAnime() {
    // Filter out API results that are already in our local collection (by title or MAL ID)
    const localMalIds = this.allAnime().map(a => a.malId);
    return this.apiResults().filter(api => !localMalIds.includes(api.mal_id));
  }

  async addAnimeFromApi(jikanAnime: JikanAnime) {
    // 1. Find the "Plan to Watch" category (closest to Backlog)
    const categories = await this.categoryService.getAllCategories();
    const backlogCat = categories.find(c => c.name.toLowerCase().includes('plan') || c.name.toLowerCase().includes('backlog')) || categories[0];
    
    // 2. Convert to our format
    const newAnime = this.malService.convertJikanToAnime(jikanAnime, backlogCat.id!);
    
    // 3. Add to local DB
    const id = await this.animeService.addAnime(newAnime);
    
    // 4. Update local state so it appears in selected
    // Note: AnimeService.getAllAnime$ is a liveQuery, so this.allAnime() will update automatically
    this.addAnime(id);
    this.apiResults.set([]);
    this.searchQuery.set('');
  }

  get selectedAnimes() {
    return this.selectedAnimeIds().map(id => this.allAnime().find(a => a.id === id)).filter(a => !!a) as Anime[];
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  addAnime(id: number) {
    this.selectedAnimeIds.update(ids => [...ids, id]);
    this.searchQuery.set('');
  }

  removeAnime(id: number) {
    this.selectedAnimeIds.update(ids => ids.filter(i => i !== id));
  }

  async save() {
    if (!this.name()) return;

    if (this.editingListId()) {
      await this.listService.updateList(this.editingListId()!, {
        name: this.name(),
        folderId: this.selectedFolderId(),
        animeIds: this.selectedAnimeIds(),
      });
    } else {
      await this.listService.addList({
        name: this.name(),
        folderId: this.selectedFolderId(),
        animeIds: this.selectedAnimeIds(),
      });
    }

    this.saved.emit();
    this.closeDialog();
  }
}
