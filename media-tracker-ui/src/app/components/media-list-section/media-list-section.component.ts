import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListService } from '../../services/list.service';
import { List } from '../../models/list.model';
import { LucideAngularModule, ListPlus, X, Plus, List as ListIcon } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { PopoverComponent } from '../ui/popover/popover.component';
import { BrowseListPopoverComponent } from '../../pages/browse/components/browse-list-popover/browse-list-popover.component';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-media-list-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, PopoverComponent, BrowseListPopoverComponent],
  templateUrl: './media-list-section.component.html',
  styleUrl: './media-list-section.component.scss'
})
export class MediaListSectionComponent {
  mediaId = input.required<number>();
  lists = input.required<List[]>();
  
  updated = output<void>();

  private listService = inject(ListService);
  private toast = inject(ToastService);

  readonly ListPlusIcon = ListPlus;
  readonly ListIcon = ListIcon;
  readonly XIcon = X;
  readonly PlusIcon = Plus;

  showAddPopover = signal(false);
  availableLists = signal<List[]>([]);

  async toggleAddPopover(event: Event) {
    event.stopPropagation();
    if (!this.showAddPopover()) {
      const allLists = await firstValueFrom(this.listService.getLists$());
      this.availableLists.set(allLists);
      this.showAddPopover.set(true);
    } else {
      this.showAddPopover.set(false);
    }
  }

  async onSelectList(list: List) {
    const currentIds = list.mediaItemIds || [];
    if (currentIds.includes(this.mediaId())) {
      this.toast.info('Item já está nesta lista');
      this.showAddPopover.set(false);
      return;
    }

    try {
      await this.listService.updateList(list.id!, {
        mediaItemIds: [...currentIds, this.mediaId()],
        animeIds: [...(list.animeIds || []), this.mediaId()] // Legacy support
      });
      this.toast.success(`Adicionado à lista ${list.name}`);
      this.showAddPopover.set(false);
      this.updated.emit();
    } catch (error) {
      this.toast.error('Falha ao adicionar à lista');
    }
  }

  async onCreateList(name: string) {
    try {
      const newListId = await this.listService.addList({
        name,
        mediaItemIds: [this.mediaId()],
        animeIds: [this.mediaId()],
        version: 1
      });
      this.toast.success(`Lista "${name}" criada e item adicionado!`);
      this.showAddPopover.set(false);
      this.updated.emit();
    } catch (error) {
      this.toast.error('Falha ao criar lista');
    }
  }

  async removeFromList(list: List, event: Event) {
    event.stopPropagation();
    try {
      const newMediaIds = (list.mediaItemIds || []).filter(id => id !== this.mediaId());
      const newAnimeIds = (list.animeIds || []).filter(id => id !== this.mediaId());
      
      await this.listService.updateList(list.id!, {
        mediaItemIds: newMediaIds,
        animeIds: newAnimeIds
      });
      
      this.toast.success(`Removido da lista ${list.name}`);
      this.updated.emit();
    } catch (error) {
      this.toast.error('Falha ao remover da lista');
    }
  }
}
