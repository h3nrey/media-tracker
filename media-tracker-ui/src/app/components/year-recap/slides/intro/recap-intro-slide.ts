import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Zap } from 'lucide-angular';

@Component({
  selector: 'app-recap-intro-slide',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="slide intro">
      <div class="accent-glow"></div>
      <div class="content-wrapper">
        <div class="year-badge">{{ year }}</div>
        <h1 class="title-anim">Seu Ano em<br><span class="highlight">Anime</span></h1>
        <p class="desc-anim">Pronto para reviver sua jornada?</p>
        <button class="start-btn btn-anim" (click)="start.emit()">
          Começar Experiência
          <lucide-icon [img]="ZapIcon" [size]="18"></lucide-icon>
        </button>
      </div>
    </div>
  `,
  styleUrl: './recap-intro-slide.scss'
})
export class RecapIntroSlideComponent {
  @Input({ required: true }) year!: number;
  @Output() start = new EventEmitter<void>();
  readonly ZapIcon = Zap;
}
