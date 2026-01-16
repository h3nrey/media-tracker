import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star } from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';

@Component({
  selector: 'app-timeline-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="timeline-card" (click)="click.emit(anime)">
      <div class="cover-wrapper">
        <img [src]="anime.coverImage || 'assets/placeholder-cover.jpg'" [alt]="anime.title">
        <div class="score-badge" [ngClass]="getScoreColor(anime.score)">
           <lucide-icon [img]="StarIcon" [size]="12"></lucide-icon>
           <span>{{ anime.score }}</span>
        </div>
      </div>
      <div class="card-info">
        <h3>{{ anime.title }}</h3>
        <p>{{ anime.progressCurrent }} / {{ anime.progressTotal || '?' }} eps</p>
      </div>
    </div>
  `,
  styles: [`
    .timeline-card {
      cursor: pointer;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;

      &:hover {
        transform: translateY(-4px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(139, 92, 246, 0.3);
        box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.5);

        .cover-wrapper img {
            transform: scale(1.05);
        }
      }
    }

    .cover-wrapper {
      position: relative;
      aspect-ratio: 2/3;
      overflow: hidden;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .score-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
        font-weight: 800;
        color: #fbbf24;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    }

    .card-info {
      padding: 0.75rem;
      flex: 1;

      h3 {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #f1f5f9;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.25rem;
        line-height: 1.3;
      }

      p {
        margin: 0;
        font-size: 0.7rem;
        font-weight: 500;
        color: #64748b;
      }
    }
  `]
})
export class TimelineCardComponent {
  @Input({ required: true }) anime!: Anime;
  @Output() click = new EventEmitter<Anime>();

  readonly StarIcon = Star;

  getScoreColor(score: number): string {
    return getScoreColorClass(score);
  }
}
