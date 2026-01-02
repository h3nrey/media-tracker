import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Library, Layers, Monitor } from 'lucide-angular';

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss'
})
export class MobileBottomNavComponent {
  @Output() manageCategories = new EventEmitter<void>();
  @Output() manageSources = new EventEmitter<void>();
  
  readonly LibraryIcon = Library;
  readonly LayersIcon = Layers;
  readonly MonitorIcon = Monitor;
}
