import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, Layers, Folder as FolderIcon, Book, Gamepad2, Film, Star, Heart, Bookmark, Hash, Edit2 } from 'lucide-angular';
import { Folder, List } from '../../../../models/list.model';
import { ListService } from '../../../../services/list.service';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DragDropModule, FormsModule],
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
  readonly HashIcon = Hash;
  readonly EditIcon = Edit2;

  isAddingFolder = signal(false);
  editingFolderId = signal<number | null>(null);
  newFolderName = signal('');
  selectedIcon = signal('folder');

  availableIcons = [
    { name: 'folder', icon: FolderIcon },
    { name: 'book', icon: Book },
    { name: 'gamepad', icon: Gamepad2 },
    { name: 'film', icon: Film },
    { name: 'star', icon: Star },
    { name: 'heart', icon: Heart },
    { name: 'bookmark', icon: Bookmark }
  ];

  getIconComponent(iconName: string | undefined) {
    const found = this.availableIcons.find(i => i.name === iconName);
    return found ? found.icon : FolderIcon;
  }

  async createNewFolder() {
    this.editingFolderId.set(null);
    this.isAddingFolder.set(true);
    this.newFolderName.set('');
    this.selectedIcon.set('folder');
  }

  startEditingFolder(folder: Folder, event: Event) {
    event.stopPropagation();
    this.editingFolderId.set(folder.id!);
    this.newFolderName.set(folder.name);
    this.selectedIcon.set(folder.icon || 'folder');
    this.isAddingFolder.set(true);
  }

  cancelAddingFolder() {
    this.isAddingFolder.set(false);
    this.editingFolderId.set(null);
  }

  async saveFolder() {
    if (!this.newFolderName().trim()) return;

    if (this.editingFolderId()) {
      await this.listService.updateFolder(this.editingFolderId()!, {
        name: this.newFolderName(),
        icon: this.selectedIcon(),
        updatedAt: new Date()
      });
    } else {
      await this.listService.addFolder({
        name: this.newFolderName(),
        icon: this.selectedIcon(),
        order: (this.folders?.length || 0) + 1,
        version: 1
      });
    }

    this.isAddingFolder.set(false);
    this.editingFolderId.set(null);
  }

  async onListDrop(event: CdkDragDrop<any>, folderId: number | 'all') {
    const targetFolderId = folderId === 'all' ? undefined : folderId;
    const list = event.item.data as List;
    
    if (list.folderId === targetFolderId) return;

    await this.listService.updateList(list.id!, {
      folderId: targetFolderId
    });
  }
}
