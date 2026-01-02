import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Plus, Trash2, Edit2, Check, ExternalLink } from 'lucide-angular';
import { WatchSourceService } from '../../services/watch-source.service';
import { WatchSource } from '../../models/watch-source.model';

@Component({
  selector: 'app-manage-sources-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './manage-sources-dialog.component.html',
  styleUrl: './manage-sources-dialog.component.scss'
})
export class ManageSourcesDialogComponent {
  isOpen = signal(false);
  sources = signal<WatchSource[]>([]);
  
  // Edit/Add state
  editingId = signal<number | null>(null);
  editName = signal('');
  editUrl = signal('');
  
  newName = signal('');
  newUrl = signal('');

  readonly XIcon = X;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly EditIcon = Edit2;
  readonly CheckIcon = Check;
  readonly ExternalLinkIcon = ExternalLink;

  constructor(private sourceService: WatchSourceService) {
    this.loadSources();
  }

  open() {
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
    this.loadSources();
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    this.resetForm();
  }

  private loadSources() {
    this.sourceService.getAllSources$().subscribe(sources => {
      this.sources.set(sources);
    });
  }

  async addSource() {
    if (!this.newName().trim()) return;
    
    await this.sourceService.addSource({
      name: this.newName().trim(),
      baseUrl: this.newUrl().trim()
    });
    
    this.newName.set('');
    this.newUrl.set('');
  }

  startEdit(source: WatchSource) {
    this.editingId.set(source.id!);
    this.editName.set(source.name);
    this.editUrl.set(source.baseUrl || '');
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editName.set('');
    this.editUrl.set('');
  }

  async saveEdit() {
    if (this.editingId() && this.editName().trim()) {
      await this.sourceService.updateSource(this.editingId()!, {
        name: this.editName().trim(),
        baseUrl: this.editUrl().trim()
      });
      this.cancelEdit();
    }
  }

  async deleteSource(id: number) {
    if (confirm('Delete this source?')) {
      await this.sourceService.deleteSource(id);
    }
  }
  
  private resetForm() {
    this.newName.set('');
    this.newUrl.set('');
    this.cancelEdit();
  }
}
