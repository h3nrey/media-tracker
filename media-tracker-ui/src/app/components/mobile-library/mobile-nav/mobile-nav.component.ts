import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Library, Layers, Monitor } from 'lucide-angular';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss'
})
export class MobileNavComponent {
  @Output() manageCategories = new EventEmitter<void>();
  @Output() manageSources = new EventEmitter<void>();
  
  readonly LibraryIcon = Library;
  readonly LayersIcon = Layers;
  readonly MonitorIcon = Monitor;
}
