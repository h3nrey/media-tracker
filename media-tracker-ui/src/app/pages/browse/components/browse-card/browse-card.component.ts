import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star, Bookmark, Check, X, ListPlus, Plus, Play } from 'lucide-angular';
import { BrowseItem } from '../../browse.component';
import { Category } from '../../../../models/status.model';
import { ListService } from '../../../../services/list.service';
import { List } from '../../../../models/list.model';
import { ToastService } from '../../../../services/toast.service';
import { firstValueFrom } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { PopoverComponent } from '../../../../components/ui/popover/popover.component';

@Component({
  selector: 'app-browse-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, PopoverComponent],
  templateUrl: './browse-card.component.html',
  styleUrl: './browse-card.component.scss'
})
export class BrowseCardComponent {
  private listService = inject(ListService);
  private toast = inject(ToastService);

  @Input({ required: true }) item!: BrowseItem;
  @Input() isAdded = false;
  @Input() categories: Category[] = [];
  @Input() showCategoryTooltip = false;

  @Output() viewDetails = new EventEmitter<BrowseItem>();
  @Output() quickAdd = new EventEmitter<BrowseItem>();
  @Output() changeCategory = new EventEmitter<{ item: BrowseItem, category: Category }>();
  @Output() closeTooltip = new EventEmitter<void>();
  @Output() addToListEvent = new EventEmitter<{ item: BrowseItem, list: List }>();
  @Output() playTrailer = new EventEmitter<BrowseItem>();

  // List management state
  showListMenu = signal(false);
  availableLists = signal<List[]>([]);
  isCreatingList = signal(false);
  newListName = '';

  readonly StarIcon = Star;
  readonly BookmarkIcon = Bookmark;
  readonly CheckIcon = Check;
  readonly XIcon = X;
  readonly ListPlusIcon = ListPlus;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;

  async toggleListMenu(event: Event) {
    event.stopPropagation();
    if (!this.showListMenu()) {
      const lists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(lists);
    }
    this.showListMenu.update(v => !v);
  }

  async addToList(list: List, event: Event) {
    event.stopPropagation();
    this.addToListEvent.emit({ item: this.item, list });
    this.showListMenu.set(false);
  }

  async createAndAddList(event: Event) {
    event.stopPropagation();
    if (!this.newListName.trim()) return;

    try {
      const newListId = await this.listService.addList({
        name: this.newListName,
        mediaItemIds: [],
        animeIds: []
      });
      this.toast.success(`Lista "${this.newListName}" criada!`);
      this.newListName = '';
      this.isCreatingList.set(false);
      
      // Refresh lists
      const lists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(lists);
    } catch (error) {
      this.toast.error('Falha ao criar lista');
    }
  }
}
