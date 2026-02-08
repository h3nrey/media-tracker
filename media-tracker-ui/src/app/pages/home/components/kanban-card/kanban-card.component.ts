import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LucideAngularModule, Star, MoreVertical, Edit2, Trash2, Plus, Play, RefreshCw, History } from 'lucide-angular';
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
export class KanbanCardComponent implements OnInit, OnDestroy {
  @Input() media!: MediaItem;
  @Output() edit = new EventEmitter<MediaItem>();
  @Output() delete = new EventEmitter<MediaItem>();
  @Output() increment = new EventEmitter<MediaItem>();
  @Output() complete = new EventEmitter<MediaItem>();
  @Output() addNewRun = new EventEmitter<MediaItem>();
  @Output() addLog = new EventEmitter<MediaItem>();
  @Input() url = 'anime';
  @Input() isSelected = false;
  @Input() isCompleted = false;
  
  @Output() mediaClick = new EventEmitter<{ media: MediaItem, event: MouseEvent }>();
  
  readonly StarIcon = Star;
  readonly MoreVerticalIcon = MoreVertical;
  readonly EditIcon = Edit2;
  readonly TrashIcon = Trash2;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;
  readonly RefreshIcon = RefreshCw;
  readonly LogIcon = History;

  menuOpen = signal(false);
  hasSources = signal(false);
  isLongPressing = signal(false);

  private longPressTimer: any = null;
  private readonly LONG_PRESS_DURATION = 500; // ms

  constructor(private watchSourceService: WatchSourceService) {}

  ngOnInit() {
    this.checkSources();
  }

  ngOnDestroy() {
    this.clearLongPressTimer();
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

  onCardMouseDown(event: MouseEvent) {
    // Don't start long press if clicking on buttons or menu
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('.card-actions') || target.closest('.cover-wrapper')) {
      return;
    }

    this.startLongPress();
  }

  onCardMouseUp(event: MouseEvent) {
    const wasLongPressing = this.isLongPressing();
    this.clearLongPressTimer();

    // If it wasn't a long press, treat it as a regular click
    if (!wasLongPressing) {
      this.onCardClick(event);
    }
  }

  onCardMouseLeave() {
    this.clearLongPressTimer();
  }

  startLongPress() {
    this.clearLongPressTimer();
    
    this.longPressTimer = setTimeout(() => {
      this.isLongPressing.set(true);
      this.onComplete();
    }, this.LONG_PRESS_DURATION);
  }

  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.isLongPressing.set(false);
  }

  onCardClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.mediaClick.emit({ media: this.media, event });
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

  onComplete() {
    this.complete.emit(this.media);
  }

  onAddNewRun(event: Event) {
    event.stopPropagation();
    this.addNewRun.emit(this.media);
  }

  onAddLog(event: Event) {
    event.stopPropagation();
    this.addLog.emit(this.media);
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
