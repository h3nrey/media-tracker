import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ExternalLink, Plus, Trash2, Edit3, ChevronDown } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { WatchSourceService } from '../../../../services/watch-source.service';
import { WatchSource } from '../../../../models/watch-source.model';

@Component({
  selector: 'app-anime-links',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './anime-links.component.html',
  styleUrl: './anime-links.component.scss'
})
export class AnimeLinksComponent implements OnInit {
  private sourceService = inject(WatchSourceService);
  
  sourceLinks = input<any[] | undefined>([]);
  saveLinks = output<any[]>();

  showAddForm = signal(false);
  editingIndex = signal<number | null>(null);
  
  // Form fields
  newLinkUrl = signal('');
  newLinkName = signal('');
  selectedSourceId = signal<number | null>(null);
  
  availableSources = signal<WatchSource[]>([]);

  readonly ExternalLinkIcon = ExternalLink;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly EditIcon = Edit3;
  readonly ChevronDownIcon = ChevronDown;

  ngOnInit() {
    this.sourceService.getAllSources().then(sources => {
      this.availableSources.set(sources);
    });
  }

  toggleAddForm() {
    this.showAddForm.update(v => !v);
    this.editingIndex.set(null);
    this.resetForm();

    if (this.showAddForm() && this.availableSources().length > 0) {
      const firstSource = this.availableSources()[0];
      this.newLinkName.set(firstSource.name);
      this.selectedSourceId.set(firstSource.id || null);
      if (firstSource.baseUrl) {
        this.newLinkUrl.set(firstSource.baseUrl);
      }
    }
  }

  resetForm() {
    this.newLinkUrl.set('');
    this.newLinkName.set('');
    this.selectedSourceId.set(null);
  }

  onSourceSelect(event: any) {
    const id = +event.target.value;
    const source = this.availableSources().find(s => s.id === id);
    if (source) {
      this.newLinkName.set(source.name);
      this.selectedSourceId.set(id);
      if (source.baseUrl && !this.newLinkUrl()) {
        this.newLinkUrl.set(source.baseUrl);
      }
    }
  }

  getLinkForSource(sourceId: number) {
    return (this.sourceLinks() || []).find(l => l.sourceId === sourceId);
  }

  onAddForSource(source: WatchSource) {
    this.resetForm();
    this.newLinkName.set(source.name);
    this.selectedSourceId.set(source.id || null);
    if (source.baseUrl) {
      this.newLinkUrl.set(source.baseUrl);
    }
    this.showAddForm.set(true);
  }

  onEditLink(link: any) {
    const index = (this.sourceLinks() || []).findIndex(l => l.sourceId === link.sourceId);
    this.editingIndex.set(index !== -1 ? index : null);
    this.showAddForm.set(true);
    
    const matchedSource = this.availableSources().find(s => s.id === link.sourceId);
    this.newLinkName.set(matchedSource?.name || 'Custom');
    this.newLinkUrl.set(link.url);
    this.selectedSourceId.set(link.sourceId);
  }

  onDeleteLinkBySourceId(sourceId: number) {
    const currentLinks = [...(this.sourceLinks() || [])];
    const index = currentLinks.findIndex(l => l.sourceId === sourceId);
    if (index !== -1) {
      currentLinks.splice(index, 1);
      this.saveLinks.emit(currentLinks);
    }
  }

  onAddLink() {
    if (!this.newLinkUrl() || this.selectedSourceId() === null) return;

    const currentLinks = [...(this.sourceLinks() || [])];
    const newLink = { sourceId: this.selectedSourceId()!, url: this.newLinkUrl() };

    if (this.editingIndex() !== null) {
      currentLinks[this.editingIndex()!] = newLink;
    } else {
      const existingIndex = currentLinks.findIndex(l => l.sourceId === newLink.sourceId);
      if (existingIndex !== -1) {
        currentLinks[existingIndex] = newLink;
      } else {
        currentLinks.push(newLink);
      }
    }

    this.saveLinks.emit(currentLinks);
    this.showAddForm.set(false);
    this.editingIndex.set(null);
    this.resetForm();
  }
}
