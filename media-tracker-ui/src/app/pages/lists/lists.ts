import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, Folder as FolderIcon, Layers } from 'lucide-angular';
import { ListService } from '../../services/list.service';
import { AnimeService } from '../../services/anime.service';
import { FilterService } from '../../services/filter.service';
import { db } from '../../services/database.service';
import { List, Folder } from '../../models/list.model';
import { Anime } from '../../models/anime.model';
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
  private animeService = inject(AnimeService);
  private filterService = inject(FilterService);

  @ViewChild(ListFormComponent) listForm!: ListFormComponent;

  readonly PlusIcon = Plus;
  readonly FolderIcon = FolderIcon;

  availableGenres = signal<string[]>([]);
  availableStudios = signal<string[]>([]);
  currentFilters = this.filterService.currentFilters;

  private selectedFolderSubject = new BehaviorSubject<number | 'all'>('all');
  selectedFolderId$ = this.selectedFolderSubject.asObservable();
  
  folders$ = this.listService.getFolders$();
  
  lists$ = combineLatest([
    this.listService.getLists$(),
    this.selectedFolderId$,
    this.animeService.getAllAnime$(),
    this.animeService.filterUpdate$
  ]).pipe(
    map(([lists, folderId, allAnime]) => {
      let filteredLists = lists;
      
      if (folderId !== 'all') {
        filteredLists = filteredLists.filter(l => l.folderId === folderId);
      }

      const filters = this.currentFilters();
      if ((filters.genres && filters.genres.length > 0) || (filters.studios && filters.studios.length > 0)) {
        filteredLists = filteredLists.filter(list => {
          const listAnimes = list.animeIds.map(id => allAnime.find(a => a.id === id)).filter(a => !!a) as Anime[];
          
          const matchesGenre = filters.genres && filters.genres.length > 0 
            ? listAnimes.some(a => filters.genres!.every(g => a.genres?.includes(g)))
            : true;
          
          const matchesStudio = filters.studios && filters.studios.length > 0
            ? listAnimes.some(a => filters.studios!.some(s => a.studios?.includes(s)))
            : true;
            
          return matchesGenre && matchesStudio;
        });
      }

      if (filters.query) {
        const q = filters.query.toLowerCase();
        filteredLists = filteredLists.filter(l => l.name.toLowerCase().includes(q));
      }

      return filteredLists;
    })
  );

  enrichedLists$: Observable<any[]> = this.lists$.pipe(
    switchMap(lists => {
      return this.animeService.getAllAnime$().pipe(
        map(allAnime => {
          const result = lists.map(list => {
            const covers = list.animeIds
              .map(id => allAnime.find(a => a.id === id)?.coverImage)
              .filter(img => !!img)
              .slice(0, 5);
            
            return {
              ...list,
              covers,
              animeCount: list.animeIds.length
            };
          });

          const filters = this.currentFilters();
          const mult = filters.sortOrder === 'asc' ? 1 : -1;
          
          result.sort((a, b) => {
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
    this.animeService.getAllAnime$().subscribe(all => {
      const genres = new Set<string>();
      const studios = new Set<string>();
      all.forEach(anime => {
        anime.genres?.forEach(g => genres.add(g));
        anime.studios?.forEach(s => studios.add(s));
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
    this.listForm.open(currentFolder);
  }

  onListSaved() {
    this.animeService.triggerFilterUpdate();
  }
}
