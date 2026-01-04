import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-recap-anime-top-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide anime-top-slide">
      <div class="content-wrapper">
        <h2 class="slide-title">E estes foram seus favoritos</h2>
        
        <div class="anime-showcase" *ngIf="anime.length > 0">
          <!-- TOP 1 -->
          <div class="main-anime">
            <div class="rank-badge">1</div>
            <div class="poster-stamp">
              <div class="dots-border"></div>
              <img [src]="anime[0].coverImage" [alt]="anime[0].title">
            </div>
            <div class="meta">
              <h3 class="title">{{ anime[0].title }}</h3>
              <div class="score">Nota: {{ anime[0].score }}</div>
            </div>
          </div>

          <!-- TOP 2-5 -->
          <div class="other-anime">
            @for (item of anime.slice(1, 5); track item.id; let i = $index) {
              <div class="mini-anime">
                <div class="mini-rank">{{ i + 2 }}</div>
                <div class="mini-row">
                  <img [src]="item.coverImage" class="mini-thumb">
                  <div class="mini-meta">
                    <span class="mini-title">{{ item.title }}</span>
                    <span class="mini-score">{{ item.score }} / 10</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-anime-top-slide.scss'
})
export class RecapAnimeTopSlideComponent {
  @Input({ required: true }) anime: Anime[] = [];
}
