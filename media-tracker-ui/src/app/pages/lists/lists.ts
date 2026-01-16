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
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { DragDropModule } from '@angular/cdk/drag-drop';

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
    ListFormComponent,
    DragDropModule
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
  
  enrichedLists$: Observable<any[]> = combineLatest([
    this.listService.getLists$(),
    this.selectedFolderId$,
    this.mediaService.getAllMedia$(),
    this.mediaService.filterUpdate$
  ]).pipe(
    map(([lists, folderId, allMedia]: [List[], number | 'all', MediaItem[], number]) => {
      return this.listService.filterLists(
        lists, 
        folderId, 
        allMedia, 
        this.currentFilters()
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
