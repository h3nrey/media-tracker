import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, Folder as FolderIcon, Layers, List as ListIcon } from 'lucide-angular';
import { ListService } from '../../services/list.service';
import { MediaService } from '../../services/media.service';
import { FilterService } from '../../services/filter.service';
import { db } from '../../services/database.service';
import { List, Folder } from '../../models/list.model';
import { MediaItem, MediaType } from '../../models/media-type.model';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { BehaviorSubject, combineLatest, map, Observable, switchMap } from 'rxjs';

import { ListSidebarComponent } from './components/list-sidebar/list-sidebar.component';
import { ListFiltersComponent } from './components/list-filters/list-filters.component';
import { ListCardComponent } from './components/list-card/list-card.component';
import { ListFormComponent } from './components/list-form/list-form.component';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    ListSidebarComponent,
    ListFiltersComponent,
    ListCardComponent,
    ListFormComponent
  ],
  templateUrl: './lists.html',
  styleUrl: './lists.scss',
})
export class Lists implements OnInit {
  private listService = inject(ListService);
  private mediaService = inject(MediaService);
  private mediaTypeState = inject(MediaTypeStateService);
  private filterService = inject(FilterService);

  @ViewChild(ListFormComponent) listForm!: ListFormComponent;

  readonly PlusIcon = Plus;
  readonly FolderIcon = FolderIcon;
  readonly ListIcon = ListIcon;

  availableGenres = signal<string[]>([]);
  availableStudios = signal<string[]>([]);
  currentFilters = this.filterService.currentFilters;

  private selectedFolderSubject = new BehaviorSubject<number | 'all'>('all');
  selectedFolderId$ = this.selectedFolderSubject.asObservable();
  selectedMediaType$ = this.mediaTypeState.getSelectedMediaType$();
  
  folders$ = this.listService.getFolders$();
  
  lists$ = combineLatest([
    this.listService.getLists$(),
    this.selectedFolderId$,
    this.selectedMediaType$,
    this.mediaService.getAllMedia$(),
    this.mediaService.filterUpdate$
  ]).pipe(
    map(([lists, folderId, selectedMediaType, allMedia]: [List[], number | 'all', number | null, MediaItem[], number]) => {
      let filteredLists = lists;
      
      // Filter by media type
      if (selectedMediaType !== null) {
        filteredLists = filteredLists.filter((l: List) => l.mediaTypeId === selectedMediaType || !l.mediaTypeId);
      }

      if (folderId !== 'all') {
        filteredLists = filteredLists.filter((l: List) => l.folderId === folderId);
      }

      const filters = this.currentFilters();
      if ((filters.genres && filters.genres.length > 0) || (filters.studios && filters.studios.length > 0)) {
        filteredLists = filteredLists.filter((list: List) => {
          const itemIds = list.mediaItemIds || list.animeIds || [];
          const listItems = itemIds.map(id => allMedia.find(m => m.id === id)).filter(m => !!m) as MediaItem[];
          
          const matchesGenre = filters.genres && filters.genres.length > 0 
            ? listItems.some(item => filters.genres!.every(g => item.genres?.includes(g)))
            : true;
          
          const matchesStudio = filters.studios && filters.studios.length > 0
            ? listItems.some(item => filters.studios!.some(s => item.studios?.includes(s)))
            : true;
            
          return matchesGenre && matchesStudio;
        });
      }

      if (filters.query) {
        const q = filters.query.toLowerCase();
        filteredLists = filteredLists.filter((l: List) => l.name.toLowerCase().includes(q));
      }

      return filteredLists;
    })
  );

  enrichedLists$: Observable<any[]> = this.lists$.pipe(
    switchMap((lists: List[]) => {
      return this.mediaService.getAllMedia$().pipe(
        map((allMedia: MediaItem[]) => {
          const result = lists.map((list: List) => {
            const itemIds = list.mediaItemIds || list.animeIds || [];
            const items = itemIds.map(id => allMedia.find(m => m.id === id)).filter(m => !!m) as MediaItem[];
            
            const covers = items
              .map(item => item.coverImage)
              .filter(img => !!img)
              .slice(0, 5);
            
            return {
              ...list,
              covers,
              itemCount: items.length
            };
          });

          const filters = this.filterService.currentFilters();
          const mult = filters.sortOrder === 'asc' ? 1 : -1;
          
          result.sort((a: any, b: any) => {
            if (filters.sortBy === 'title') {
              return a.name.localeCompare(b.name) * mult;
            }
            const valA = new Date(a.updatedAt || 0).getTime();
            const valB = new Date(b.updatedAt || 0).getTime();
            return (valA - valB) * mult;
          });

          return result;
        })
      );
    })
  );

  ngOnInit() {
    this.mediaService.getAllMedia$().subscribe((all: MediaItem[]) => {
      const genres = new Set<string>();
      const studios = new Set<string>();
      all.forEach((item: MediaItem) => {
        item.genres?.forEach(g => genres.add(g));
        item.studios?.forEach(s => studios.add(s));
      });
      this.availableGenres.set([...genres].sort());
      this.availableStudios.set([...studios].sort());
    });
  }

  selectFolder(id: number | 'all') {
    this.selectedFolderSubject.next(id);
  }

  openCreateListDialog() {
    const currentFolder = this.selectedFolderSubject.value === 'all' ? undefined : this.selectedFolderSubject.value as number;
    this.listForm.open(undefined, currentFolder);
  }

  onListSaved() {
    this.mediaService.triggerFilterUpdate();
  }
}
