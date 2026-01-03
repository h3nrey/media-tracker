import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Play } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';
import { TimelineCardComponent } from '../timeline-card/timeline-card';

@Component({
  selector: 'app-timeline-year-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TimelineCardComponent],
  template: `
    <div class="year-section" [attr.id]="'year-' + year" [attr.data-year]="year">
      <div class="year-content">
        <div class="year-hero" *ngIf="anime.length > 0">
            <div class="hero-overlay"></div>
            
            @let featured = anime.slice(0, 5);
            @let activeIdx = rotation % (featured.length || 1);
            @let activeAnime = featured[activeIdx];

            <div class="hero-slideshow">
                @for (item of featured; track item.id; let i = $index) {
                    <div class="hero-slide" 
                         [class.active]="i === activeIdx"
                         [style.background-image]="'url(' + (item.bannerImage || item.coverImage) + ')'">
                    </div>
                }
            </div>

            <div class="hero-title">
                <div class="stats">
                  <span class="count">{{ anime.length }}</span>
                  <span class="label">Anime em {{ year }}</span>
                </div>
                
                @if (activeAnime?.trailerUrl) {
                    <button class="trailer-button" (click)="trailerClick.emit(activeAnime?.trailerUrl); $event.stopPropagation()">
                        <lucide-icon [img]="PlayIcon" [size]="14"></lucide-icon>
                        Trailer: {{ activeAnime?.title }}
                    </button>
                }
            </div>
        </div>

        <div class="anime-grid">
            @for (item of anime; track item.id) {
              <app-timeline-card 
                [anime]="item" 
                (click)="animeClick.emit($event)">
              </app-timeline-card>
            }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .year-section {
      width: 100%;
      padding-bottom: 6rem;
    }

    .year-content {
      display: flex;
      flex-direction: column;
    }

    .year-hero {
      height: 320px;
      position: relative;
      display: flex;
      overflow: hidden;
      background: #000;
      border-radius: 0 0 24px 24px;
      margin-bottom: 2rem;

      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, transparent, #060914);
        z-index: 10;
      }

      .hero-slideshow {
        position: absolute;
        inset: 0;
        z-index: 1;

        .hero-slide {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            opacity: 0;
            transition: opacity 1.5s ease;
            filter: brightness(0.4) saturate(0.8);
            transform: scale(1.1);

            &.active {
                opacity: 1;
                transform: scale(1);
            }
        }
      }

      .hero-title {
        position: absolute;
        bottom: 2rem;
        left: 3rem;
        z-index: 20;
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .stats {
          display: flex;
          align-items: baseline;
          gap: 1rem;
        }

        .count {
            font-size: 4rem;
            font-weight: 950;
            color: white;
            line-height: 0.8;
        }

        .label {
            font-size: 0.875rem;
            color: #a78bfa;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.2em;
        }

        .trailer-button {
            background: rgba(139, 92, 246, 0.2);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 12px;
            padding: 0.5rem 1rem;
            color: white;
            font-weight: 700;
            font-size: 0.8rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            &:hover {
                background: #8b5cf6;
                transform: translateY(-2px);
            }
        }
      }
    }

    .anime-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 2rem;
      padding: 0 3rem;
    }
  `]
})
export class TimelineYearSectionComponent {
  @Input({ required: true }) year!: number;
  @Input({ required: true }) anime: Anime[] = [];
  @Input() rotation: number = 0;

  @Output() animeClick = new EventEmitter<Anime>();
  @Output() trailerClick = new EventEmitter<string>();

  readonly PlayIcon = Play;
}
