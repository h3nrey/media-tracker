import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Anime } from '../../../models/anime.model';
import { CommonModule } from '@angular/common';
import { AnimeService } from '../../../services/anime.service';
import { LucideAngularModule, Plus } from 'lucide-angular';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [RouterLink, CommonModule, LucideAngularModule],
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.scss',
})
export class AnimeCard {
  anime = input.required<Anime>();
  private animeService = inject(AnimeService);
  readonly PlusIcon = Plus;

  incrementEpisode(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const current = this.anime().episodesWatched || 0;
    const total = this.anime().totalEpisodes;

    if (!total || current < total) {
      this.animeService.updateAnime(this.anime().id!, {
        episodesWatched: current + 1
      });
    }
  }
}
