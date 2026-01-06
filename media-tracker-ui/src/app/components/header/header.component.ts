import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Plus, Monitor, Layers, FileUp, RefreshCw, History, Settings, ChevronDown, Package, Sparkles, Film, BarChart3, PlusCircle } from 'lucide-angular';
import { MediaTypeSelectorComponent } from '../media-type-selector/media-type-selector.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, MediaTypeSelectorComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() addAnime = new EventEmitter<void>();
  @Output() manageCategories = new EventEmitter<void>();
  @Output() manageSources = new EventEmitter<void>();
  @Output() bulkImport = new EventEmitter<void>();
  @Output() refreshMetadata = new EventEmitter<void>();
  @Output() openThemeSettings = new EventEmitter<void>();

  showToolsDropdown = signal(false);

  readonly PlusIcon = Plus;
  readonly PlusCircleIcon = PlusCircle;
  readonly LayersIcon = Layers;
  readonly MonitorIcon = Monitor;
  readonly ImportIcon = FileUp;
  readonly RefreshIcon = RefreshCw;
  readonly HistoryIcon = History;
  readonly SettingsIcon = Settings;
  readonly ChevronDownIcon = ChevronDown;
  readonly ToolsIcon = Package;
  readonly SparklesIcon = Sparkles;
  readonly FilmIcon = Film;
  readonly BarChartIcon = BarChart3;

  toogleTools() {
    this.showToolsDropdown.update(v => !v);
  }
}
