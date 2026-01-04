import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Zap, Trash2 } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-recap-split-slide',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="slide split-slide">
      <div class="content-wrapper">
        <h2 class="slide-title">Contrastes do Ano</h2>
        
        <div class="split-container">
          <!-- Surprise -->
          <div class="split-side surprise" *ngIf="surprise">
            <div class="indicator">No. 1</div>
            <div class="label-group">
              <lucide-icon [img]="ZapIcon" [size]="24"></lucide-icon>
              <h3>Me Surpreendeu</h3>
            </div>
            <div class="anime-box">
              <img [src]="surprise.coverImage" alt="">
              <div class="meta">
                <h4>{{ surprise.title }}</h4>
                <span class="score">Nota: {{ surprise.score }}</span>
              </div>
            </div>
          </div>

          <!-- Fastest Dropped -->
          <div class="split-side dropped" *ngIf="dropped">
            <div class="indicator">No. 1</div>
            <div class="label-group">
              <lucide-icon [img]="TrashIcon" [size]="24"></lucide-icon>
              <h3>Drop Mais Rápido</h3>
            </div>
            <div class="anime-box">
              <img [src]="dropped.coverImage" alt="">
              <div class="meta">
                <h4>{{ dropped.title }}</h4>
                <span class="eps">{{ dropped.episodesWatched }} episódios</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-split-slide.scss'
})
export class RecapSplitSlideComponent {
  @Input({ required: true }) surprise!: Anime;
  @Input({ required: true }) dropped!: Anime;
  readonly ZapIcon = Zap;
  readonly TrashIcon = Trash2;
}
