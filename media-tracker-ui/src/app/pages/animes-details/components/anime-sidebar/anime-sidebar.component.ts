import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anime } from '../../../../models/anime.model';
import { Category } from '../../../../models/status.model';
import { AnimeLinksComponent } from '../anime-links/anime-links.component';
import { LucideAngularModule, Play, Edit3, Plus } from 'lucide-angular';

@Component({
  selector: 'app-anime-sidebar',
  standalone: true,
  imports: [CommonModule, AnimeLinksComponent, LucideAngularModule],
  templateUrl: './anime-sidebar.component.html',
  styleUrl: './anime-sidebar.component.scss'
})
export class AnimeSidebarComponent {
  anime = input<Anime | null>(null);
  category = input<Category | null>(null);
  
  edit = output<void>();
  incrementEpisode = output<void>();

  readonly PlayIcon = Play;
  readonly EditIcon = Edit3;
  readonly PlusIcon = Plus;

  onEdit() {
    this.edit.emit();
  }

  onIncrementEpisode() {
    this.incrementEpisode.emit();
  }
}
