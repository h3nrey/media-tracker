import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recap-stats-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide stats-slide">
      <div class="content-wrapper">
        <h2 class="title-anim">O Volume da sua Jornada</h2>
        
        <div class="stat-main">
          <div class="stat-item anime-watched">
            <span class="rank-anim">No. 1</span>
            <span class="label">Animes Assistidos</span>
            <div class="value">{{ totalAnime }}</div>
          </div>
          
          <div class="stat-item episodes-count">
            <span class="label">Maratona de</span>
            <div class="value">{{ totalEpisodes }}</div>
            <span class="sub-label">Episódios</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-stats-slide.scss'
})
export class RecapStatsSlideComponent {
  @Input({ required: true }) totalAnime!: number;
  @Input({ required: true }) totalEpisodes!: number;
}
