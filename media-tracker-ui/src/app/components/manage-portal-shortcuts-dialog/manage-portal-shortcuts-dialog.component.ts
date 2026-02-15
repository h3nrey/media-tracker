import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus, Trash2, Edit2, Check, ExternalLink } from 'lucide-angular';
import { PortalShortcutService } from '../../services/portal-shortcut.service';
import { PortalShortcut } from '../../models/portal-shortcut.model';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-manage-portal-shortcuts-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './manage-portal-shortcuts-dialog.component.html',
  styleUrl: './manage-portal-shortcuts-dialog.component.scss'
})
export class ManagePortalShortcutsDialogComponent implements OnInit {
  isOpen = signal(false);
  shortcuts = signal<PortalShortcut[]>([]);
  
  // Form signals
  newName = signal('');
  newUrl = signal('');
  newIconUrl = signal('');
  newMediaTypeId = signal<number>(1);

  editingId = signal<number | null>(null);
  editName = signal('');
  editUrl = signal('');
  editIconUrl = signal('');
  editMediaTypeId = signal<number>(1);

  readonly mediaTypeOptions = [
    { id: 1, name: 'Anime' },
    { id: 2, name: 'Manga' },
    { id: 3, name: 'Game' },
    { id: 4, name: 'Movie' }
  ];

  readonly XIcon = X;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly EditIcon = Edit2;
  readonly CheckIcon = Check;
  readonly ExternalLinkIcon = ExternalLink;

  private shortcutService = inject(PortalShortcutService);
  private alertService = inject(AlertService);

  ngOnInit() {
    this.loadShortcuts();
  }

  open(mediaTypeId?: number) {
    if (mediaTypeId) this.newMediaTypeId.set(mediaTypeId);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
    this.loadShortcuts();
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.resetForm();
  }

  private loadShortcuts() {
    this.shortcutService.getShortcuts$().subscribe(data => {
      this.shortcuts.set(data);
    });
  }

  async addShortcut() {
    if (!this.newName().trim() || !this.newUrl().trim()) return;

    await this.shortcutService.addShortcut({
      name: this.newName().trim(),
      url: this.newUrl().trim(),
      iconUrl: this.newIconUrl().trim() || undefined,
      mediaTypeId: this.newMediaTypeId(),
      order: this.shortcuts().length
    });

    this.resetForm();
  }

  startEdit(item: PortalShortcut) {
    this.editingId.set(item.id!);
    this.editName.set(item.name);
    this.editUrl.set(item.url);
    this.editIconUrl.set(item.iconUrl || '');
    this.editMediaTypeId.set(item.mediaTypeId);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  async saveEdit() {
    if (this.editingId() && this.editName().trim() && this.editUrl().trim()) {
      await this.shortcutService.updateShortcut(this.editingId()!, {
        name: this.editName().trim(),
        url: this.editUrl().trim(),
        iconUrl: this.editIconUrl().trim() || undefined,
        mediaTypeId: this.editMediaTypeId()
      });
      this.cancelEdit();
    }
  }

  async deleteShortcut(id: number) {
    const confirmed = await this.alertService.showConfirm('Deseja excluir este atalho do portal?', 'Excluir Atalho', 'error');
    if (confirmed) {
      await this.shortcutService.deleteShortcut(id);
    }
  }

  private resetForm() {
    this.newName.set('');
    this.newUrl.set('');
    this.newIconUrl.set('');
    this.cancelEdit();
  }
}
