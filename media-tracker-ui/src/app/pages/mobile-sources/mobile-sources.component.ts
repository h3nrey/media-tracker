import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Trash2, Edit2, Check, ExternalLink } from 'lucide-angular';
import { WatchSourceService } from '../../services/watch-source.service';
import { WatchSource } from '../../models/watch-source.model';

@Component({
  selector: 'app-mobile-sources',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './mobile-sources.component.html',
  styleUrl: './mobile-sources.component.scss'
})
export class MobileSourcesComponent {
  sources = signal<WatchSource[]>([]);
  
  editingId = signal<number | null>(null);
  editName = signal('');
  editUrl = signal('');
  
  newName = signal('');
  newUrl = signal('');

  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly EditIcon = Edit2;
  readonly CheckIcon = Check;
  readonly ExternalLinkIcon = ExternalLink;

  constructor(private sourceService: WatchSourceService) {
    this.loadSources();
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
      baseUrl: this.newUrl().trim(),
      version: 1
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
}
