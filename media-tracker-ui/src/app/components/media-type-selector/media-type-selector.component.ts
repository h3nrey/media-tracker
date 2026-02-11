import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, PlayCircle, BookOpen, Gamepad2, Clapperboard, Layers, ChevronDown } from 'lucide-angular';
import { MediaTypeStateService } from '../../services/media-type-state.service';
import { MediaType } from '../../models/media-type.model';

@Component({
  selector: 'app-media-type-selector',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './media-type-selector.component.html',
  styleUrl: './media-type-selector.component.scss'
})
export class MediaTypeSelectorComponent {
  private mediaTypeState = inject(MediaTypeStateService);
  private router = inject(Router);
  
  isOpen = signal(false);
  selectedType$ = this.mediaTypeState.getSelectedMediaType$();
  
  readonly PlayIcon = PlayCircle;
  readonly MangaIcon = BookOpen;
  readonly GameIcon = Gamepad2;
  readonly MovieIcon = Clapperboard;
  readonly AllIcon = Layers;
  readonly ChevronIcon = ChevronDown;
  
  mediaTypes = [
    { id: null, name: 'Tudo', icon: this.AllIcon },
    { id: MediaType.ANIME, name: 'Anime', icon: this.PlayIcon },
    { id: MediaType.MANGA, name: 'Manga', icon: this.MangaIcon },
    { id: MediaType.GAME, name: 'Games', icon: this.GameIcon },
    { id: MediaType.MOVIE, name: 'Movies', icon: this.MovieIcon }
  ];

  toggle() {
    this.isOpen.update((v: boolean) => !v);
  }

  getCurrentTypeLabel(id: number | null): string {
    return this.mediaTypes.find(t => t.id === id)?.name || 'Tudo';
  }

  getCurrentTypeIcon(id: number | null): any {
    return this.mediaTypes.find(t => t.id === id)?.icon || this.AllIcon;
  }

  selectType(id: number | null) {
    this.mediaTypeState.setSelectedMediaType(id);
    this.isOpen.set(false);
  }
}
