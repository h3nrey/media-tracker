import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { CommonModule } from '@angular/common';
import { map, switchMap } from 'rxjs';

import { AnimeCard } from '../../components/cards/anime-card/anime-card';

@Component({
  selector: 'app-list-details',
  standalone: true,
  imports: [CommonModule, AnimeCard],
  templateUrl: './list-details.html',
  styleUrl: './list-details.scss',
})
export class ListDetailsComponent {
  private readonly listService = inject(ListService);
  private readonly route = inject(ActivatedRoute);

  list = toSignal(
    this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      switchMap(id => this.listService.getListById$(id))
    )
  );

  stats = computed(() => {
    const listData = this.list();
    if (!listData || !listData.animes) return { watched: 0, total: 0, percentage: 0 };
    
    const stats = listData.animes.reduce((acc, anime) => ({
      watched: acc.watched + (anime.episodesWatched || 0),
      total: acc.total + (anime.totalEpisodes || 0)
    }), { watched: 0, total: 0 });

    const percentage = stats.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;
    
    return { ...stats, percentage };
  });
}
