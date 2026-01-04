import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, Layers } from 'lucide-angular';
import { Folder } from '../../../../models/list.model';
import { ListService } from '../../../../services/list.service';
import { db } from '../../../../services/database.service';

@Component({
  selector: 'app-list-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './list-sidebar.component.html',
  styleUrl: './list-sidebar.component.scss'
})
export class ListSidebarComponent {
  private listService = inject(ListService);
  
  @Input() selectedFolderId: number | 'all' = 'all';
  @Input() folders: Folder[] | null = [];
  @Output() folderSelect = new EventEmitter<number | 'all'>();

  readonly PlusIcon = Plus;
  readonly LayersIcon = Layers;

  async createNewFolder() {
    const name = prompt('Enter folder name:');
    if (name) {
      await this.listService.addFolder({
        name,
        order: (await db.folders.count()) + 1
      });
    }
  }
}
