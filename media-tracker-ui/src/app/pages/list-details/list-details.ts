import { Component, inject, computed, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { CommonModule } from '@angular/common';
import { map, switchMap } from 'rxjs';

import { ListFormComponent } from '../lists/components/list-form/list-form.component';
import { ListHeroComponent } from './components/list-hero/list-hero.component';
import { ListHeaderComponent } from './components/list-header/list-header.component';
import { ListStatsComponent } from './components/list-stats/list-stats.component';
import { ListAnimesComponent } from './components/list-animes/list-animes.component';

@Component({
  selector: 'app-list-details',
  standalone: true,
  imports: [
    CommonModule, 
    ListFormComponent, 
    ListHeroComponent, 
    ListHeaderComponent, 
    ListStatsComponent, 
    ListAnimesComponent
  ],
  templateUrl: './list-details.html',
  styleUrl: './list-details.scss',
})
export class ListDetailsComponent {
  private readonly listService = inject(ListService);
  private readonly route = inject(ActivatedRoute);
  
  listForm = viewChild(ListFormComponent);

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
      watched: acc.watched + (anime.progressCurrent || 0),
      total: acc.total + (anime.progressTotal || 0)
    }), { watched: 0, total: 0 });

    const percentage = stats.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;
    
    return { ...stats, percentage };
  });

  openEditForm() {
    this.listForm()?.open(this.list());
  }
}
