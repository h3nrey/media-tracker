import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';
import { SafePipe } from '../../../../pipes/safe.pipe';

@Component({
  selector: 'app-trailer-overlay',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SafePipe],
  template: `
    <div class="fullscreen-overlay fade-in" (click)="close.emit()">
      <button class="close-btn" (click)="close.emit()">
        <lucide-icon [img]="XIcon" [size]="32"></lucide-icon>
      </button>
      
      <div class="overlay-content" (click)="$event.stopPropagation()">
        <div class="video-container" *ngIf="trailerUrl">
          <iframe 
            [src]="trailerUrl | safe:'resourceUrl'" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            class="trailer-iframe"
          ></iframe>
        </div>
        
        <div class="overlay-info" *ngIf="title">
          <h3>{{ title }}</h3>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fullscreen-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(10px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .close-btn {
      position: absolute;
      top: 2rem;
      right: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 10001;

      &:hover {
        background: var(--app-primary);
        transform: rotate(90deg);
        border-color: var(--app-primary);
      }
    }

    .overlay-content {
      width: 100%;
      max-width: 1200px;
      aspect-ratio: 16 / 9;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .video-container {
      flex: 1;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      background: black;
      border: 1px solid var(--app-border);
    }

    .trailer-iframe {
      width: 100%;
      height: 100%;
    }

    .overlay-info {
      color: white;
      text-align: center;
      
      h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(to right, white, #999);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .fade-in {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 768px) {
      .fullscreen-overlay {
        padding: 1rem;
      }
      
      .close-btn {
        top: 1rem;
        right: 1rem;
      }

      .overlay-info h3 {
        font-size: 1.2rem;
      }
    }
  `]
})
export class TrailerOverlayComponent {
  @Input() trailerUrl: string | null = null;
  @Input() title: string | null = null;
  @Output() close = new EventEmitter<void>();

  readonly XIcon = X;
}
