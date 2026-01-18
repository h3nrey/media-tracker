import { Component, input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Layers, ChevronRight, List as ListIcon } from 'lucide-angular';
import { MediaItem } from '../../../../models/media-type.model';
import { ListService } from '../../../../services/list.service';
import { List } from '../../../../models/list.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { ListCardComponent } from '../../../lists/components/list-card/list-card.component';
import { StatsEmptyStateComponent } from '../stats-empty-state/stats-empty-state.component';

@Component({
  selector: 'app-stats-lists',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, ListCardComponent, StatsEmptyStateComponent],
  templateUrl: './stats-lists.component.html',
  styleUrl: './stats-lists.component.scss'
})
export class StatsListsComponent {
  private listService = inject(ListService);
  
  mediaList = input.required<MediaItem[]>();
  allMedia = input.required<MediaItem[]>();
  
  readonly LayersIcon = Layers;
  readonly ListIcon = ListIcon;
  readonly ChevronRightIcon = ChevronRight;

  private allLists = toSignal(this.listService.getLists$(), { initialValue: [] as List[] });

  enrichedLists = computed(() => {
    const lists = this.allLists();
    const media = this.allMedia();
    
    // Leverage ListService for consistent enrichment
    const enriched = this.listService.filterLists(lists, 'all', media, {});
    
    return enriched
      .sort((a, b) => b.itemCount - a.itemCount)
      .slice(0, 6);
  });
}
