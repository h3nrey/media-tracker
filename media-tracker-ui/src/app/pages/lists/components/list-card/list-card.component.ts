import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Folder as FolderIcon, MoreVertical, Pencil, Trash2 } from 'lucide-angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-list-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './list-card.component.html',
  styleUrl: './list-card.component.scss'
})
export class ListCardComponent implements OnInit {
  @Input() list: any;
  @Input() showActions = true;
  @Output() cardClick = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();

  readonly FolderIcon = FolderIcon;
  readonly MoreIcon = MoreVertical;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;

  showMenu = signal(false);

  ngOnInit() {
    console.log(this.list);
  }

  toggleMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showMenu.set(!this.showMenu());
  }

  onEdit(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.edit.emit(this.list);
    this.showMenu.set(false);
  }

  onDelete(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.delete.emit(this.list);
    this.showMenu.set(false);
  }
}
