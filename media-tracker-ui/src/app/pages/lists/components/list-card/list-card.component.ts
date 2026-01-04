import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Folder as FolderIcon } from 'lucide-angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-list-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './list-card.component.html',
  styleUrl: './list-card.component.scss'
})
export class ListCardComponent {
  @Input() list: any;
  @Output() cardClick = new EventEmitter<void>();

  readonly FolderIcon = FolderIcon;
}
