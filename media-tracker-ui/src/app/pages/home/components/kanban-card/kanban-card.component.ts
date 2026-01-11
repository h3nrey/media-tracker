import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule, Star, MoreVertical, Edit2, Trash2, Plus, Play } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../../../models/media-type.model';
import { WatchSourceService } from '../../../../services/watch-source.service';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule, DragDropModule, LucideAngularModule, RouterLink],
  templateUrl: './kanban-card.component.html',
  styleUrl: './kanban-card.component.scss'
})
export class KanbanCardComponent implements OnInit {
  @Input() media!: MediaItem;
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() delete = new EventEmitter<MediaItem>();
  @Output() increment = new EventEmitter<MediaItem>();
  
  readonly StarIcon = Star;
  readonly MoreVerticalIcon = MoreVertical;
  readonly EditIcon = Edit2;
  readonly TrashIcon = Trash2;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;

  menuOpen = signal(false);
  hasSources = signal(false);

  constructor(private watchSourceService: WatchSourceService) {}

  ngOnInit() {
    this.checkSources();
  }

  async checkSources() {
    if (this.media.sourceLinks && this.media.sourceLinks.length > 0) {
      this.hasSources.set(true);
      return;
    }

    const globalSources = await this.watchSourceService.getAllSources();
    this.hasSources.set(globalSources.length > 0);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  onEdit(event: Event) {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.edit.emit(this.media);
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.delete.emit(this.media);
  }

  onIncrement(event: Event) {
    event.stopPropagation();
    this.increment.emit(this.media);
  }

  async playFirstSource(event: Event) {
    event.stopPropagation();
    
    if (this.media.sourceLinks && this.media.sourceLinks.length > 0) {
      window.open(this.media.sourceLinks[0].url, '_blank');
      return;
    }

    const globalSources = await this.watchSourceService.getAllSources();
    if (globalSources.length > 0) {
      const source = globalSources[0];
      if (source.baseUrl) {
        const url = source.baseUrl + encodeURIComponent(this.media.title);
        window.open(url, '_blank');
      }
    }
  }
}
