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
import { BrowseListPopoverComponent } from '../browse-list-popover/browse-list-popover.component';

@Component({
  selector: 'app-browse-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, PopoverComponent, BrowseListPopoverComponent],
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
  // Action Menu state
  showActionMenu = signal(false);
  actionMenuInitialView = signal<'lists' | 'status'>('lists');
  availableLists = signal<List[]>([]);

  readonly StarIcon = Star;
  readonly BookmarkIcon = Bookmark;
  readonly CheckIcon = Check;
  readonly XIcon = X;
  readonly ListPlusIcon = ListPlus;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;

  async toggleActionMenu(event: Event, initialView: 'lists' | 'status' = 'lists') {
    event.stopPropagation();
    if (!this.showActionMenu() || initialView !== this.actionMenuInitialView()) {
      const lists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(lists);
      this.actionMenuInitialView.set(initialView);
      this.showActionMenu.set(true);
    } else {
      this.showActionMenu.set(false);
    }
  }

  async onSelectList(list: List) {
    this.addToListEvent.emit({ item: this.item, list });
    this.showActionMenu.set(false);
  }

  async onSelectCategory(category: Category) {
    this.changeCategory.emit({ item: this.item, category });
    this.showActionMenu.set(false);
  }

  async onCategoryClick(event: Event) {
    event.stopPropagation();
    if (this.isAdded) {
      this.toggleActionMenu(event, 'status');
    } else {
      // If not added, still open the status menu so user can choose where to add
      this.toggleActionMenu(event, 'status');
    }
  }

  async onCreateList(name: string) {
    try {
      const newListId = await this.listService.addList({
        name,
        mediaItemIds: [],
        animeIds: []
      });
      this.toast.success(`Lista "${name}" criada!`);
      
      // Refresh lists
      const lists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(lists);
    } catch (error) {
      this.toast.error('Falha ao criar lista');
    }
  }
}
