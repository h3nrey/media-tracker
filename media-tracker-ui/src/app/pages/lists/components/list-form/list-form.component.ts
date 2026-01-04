import { Component, signal, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Search, Plus, Trash2 } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ListService } from '../../../../services/list.service';
import { AnimeService } from '../../../../services/anime.service';
import { Anime } from '../../../../models/anime.model';
import { Folder } from '../../../../models/list.model';

@Component({
  selector: 'app-list-form',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './list-form.component.html',
  styleUrl: './list-form.component.scss'
})
export class ListFormComponent {
  private listService = inject(ListService);
  private animeService = inject(AnimeService);

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  isOpen = signal(false);
  name = signal('');
  selectedFolderId = signal<number | undefined>(undefined);
  selectedAnimeIds = signal<number[]>([]);
  
  folders = signal<Folder[]>([]);
  allAnime = signal<Anime[]>([]);
  searchQuery = signal('');

  readonly XIcon = X;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;

  async open(folderId?: number) {
    this.name.set('');
    this.selectedFolderId.set(folderId);
    this.selectedAnimeIds.set([]);
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

  get filteredAnime() {
    const query = this.searchQuery().toLowerCase();
    if (!query || query.length < 2) return [];
    return this.allAnime().filter(a => 
      a.title.toLowerCase().includes(query) && 
      !this.selectedAnimeIds().includes(a.id!)
    ).slice(0, 5);
  }

  get selectedAnimes() {
    return this.selectedAnimeIds().map(id => this.allAnime().find(a => a.id === id)).filter(a => !!a) as Anime[];
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

    await this.listService.addList({
      name: this.name(),
      folderId: this.selectedFolderId(),
      animeIds: this.selectedAnimeIds(),
      // isDeleted: false
    });

    this.saved.emit();
    this.closeDialog();
  }
}
