import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-recap-highlight-slide',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="slide highlight-slide">
      <div class="content-wrapper">
        <h2 class="slide-title">Sua Obra-Prima</h2>
        
        <div class="main-reveal" *ngIf="anime">
          <div class="number-one">No. 1</div>
          
          <div class="reveal-card">
            <img [src]="anime.coverImage" [alt]="anime.title">
            <div class="score-badge">
              <lucide-icon [img]="StarIcon" [size]="14"></lucide-icon>
              {{ anime.score }}
            </div>
          </div>
          
          <div class="reveal-info">
            <h3 class="anime-title">{{ anime.title }}</h3>
            <p class="flavor">Definiu seu padrão de qualidade em {{ year }}.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-highlight-slide.scss'
})
export class RecapHighlightSlideComponent {
  @Input({ required: true }) anime!: Anime;
  @Input({ required: true }) year!: number;
  readonly StarIcon = Star;
}
