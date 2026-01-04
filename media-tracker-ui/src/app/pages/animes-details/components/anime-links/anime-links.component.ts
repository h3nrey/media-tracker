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
  
  watchLinks = input<any[] | undefined>([]);
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

  getLinkForSource(sourceName: string) {
    return (this.watchLinks() || []).find(l => l.name === sourceName);
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
    const index = (this.watchLinks() || []).findIndex(l => l.name === link.name);
    this.editingIndex.set(index !== -1 ? index : null);
    this.showAddForm.set(true);
    this.newLinkName.set(link.name);
    this.newLinkUrl.set(link.url);
    
    // Try to match with existing source
    const matchedSource = this.availableSources().find(s => s.name === link.name);
    this.selectedSourceId.set(matchedSource?.id || null);
  }

  onDeleteLinkByName(name: string) {
    const currentLinks = [...(this.watchLinks() || [])];
    const index = currentLinks.findIndex(l => l.name === name);
    if (index !== -1) {
      currentLinks.splice(index, 1);
      this.saveLinks.emit(currentLinks);
    }
  }

  onAddLink() {
    if (!this.newLinkUrl() || !this.newLinkName()) return;

    const currentLinks = [...(this.watchLinks() || [])];
    const newLink = { name: this.newLinkName(), url: this.newLinkUrl() };

    if (this.editingIndex() !== null) {
      currentLinks[this.editingIndex()!] = newLink;
    } else {
      // If adding a predefined source that already exists, update it instead
      const existingIndex = currentLinks.findIndex(l => l.name === newLink.name);
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
