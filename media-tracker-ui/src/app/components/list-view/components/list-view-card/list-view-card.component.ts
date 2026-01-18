import { Component, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Pencil, Trash2, Star, Tag } from 'lucide-angular';
import { MediaItem } from '../../../../models/media-type.model';
import { Category } from '../../../../models/status.model';
import { SelectComponent } from '../../../ui/select/select';

@Component({
  selector: 'app-list-view-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SelectComponent],
  templateUrl: './list-view-card.component.html',
  styleUrl: './list-view-card.component.scss'
})
export class ListViewCardComponent {
  media = input.required<MediaItem>();
  showProgress = input<boolean>(true);
  isSelected = input<boolean>(false);
  categories = input<Category[]>([]);
  
  @Output() cardClick = new EventEmitter<{ media: MediaItem, event: MouseEvent }>();
  @Output() edit = new EventEmitter<{ media: MediaItem, event: Event }>();
  @Output() delete = new EventEmitter<{ media: MediaItem, event: Event }>();
  @Output() statusChange = new EventEmitter<{ media: MediaItem, statusId: number }>();

  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly StarIcon = Star;
  readonly StatusIcon = Tag;

  get categoryOptions() {
    return this.categories().map(c => ({
      value: c.supabaseId,
      label: c.name
    }));
  }

  onCardClick(event: MouseEvent) {
    this.cardClick.emit({ media: this.media(), event });
  }

  onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit({ media: this.media(), event });
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit({ media: this.media(), event });
  }

  onStatusChange(statusId: number) {
    this.statusChange.emit({ media: this.media(), statusId });
  }

  onSelectClick(event: Event) {
    event.stopPropagation();
  }
}
