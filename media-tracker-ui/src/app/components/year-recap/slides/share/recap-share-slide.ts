import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  LucideAngularModule, 
  Download, 
  Zap, 
  ArrowLeft, 
  Share2,
  Music, 
  Ghost, 
  Flame, 
  Rocket, 
  Heart, 
  Sword, 
  PartyPopper, 
  Brain, 
  Trees, 
  Footprints, 
  Wand2, 
  HelpCircle 
} from 'lucide-angular';
import { Anime } from '../../../../models/anime.model';

@Component({
  selector: 'app-recap-share-slide',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="slide share-slide">
      <div class="content-wrapper">
        <div class="share-card-container">
          <div class="share-card" #recapCard>
            <div class="card-header">
               <div class="header-line"></div>
               <div class="rec-tag">{{ year }} RECAP</div>
               <div class="header-line"></div>
            </div>
            
            <div class="main-sections">
              <!-- TOP STUDIOS (Left) -->
              <div class="stat-column">
                <div class="col-title">Top<br>estúdios</div>
                <div class="top-visual studio">
                   <div class="circle-v">
                     <span class="initial">{{ topStudios[0][0].charAt(0) }}</span>
                   </div>
                </div>
                <div class="item-list">
                   @for (s of topStudios.slice(0, 5); track s[0]; let i = $index) {
                    <div class="list-item">
                      <span class="rank">{{ i + 1 }}</span>
                      <span class="name">{{ s[0] }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- TOP ANIME (Right) -->
              <div class="stat-column">
                <div class="col-title">Top<br>animes</div>
                <div class="top-visual anime">
                  <div class="rect-v">
                    <img [src]="topAnime[0].coverImage" *ngIf="topAnime.length > 0">
                  </div>
                </div>
                <div class="item-list">
                  @for (a of topAnime.slice(0, 5); track a.id; let i = $index) {
                    <div class="list-item">
                      <span class="rank">{{ i + 1 }}</span>
                      <span class="name">{{ a.title }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="bottom-passport">
              <div class="passport-title">MEUS GÊNEROS DOMINANTES</div>
              <div class="stamps-grid">
                @for (g of topGenres.slice(0, 3); track g[0]) {
                  <div class="genre-stamp">
                    <div class="stamp-shape">
                      <div class="inner-icon">
                        <lucide-icon [img]="getGenreIcon(g[0])" [size]="28"></lucide-icon>
                      </div>
                    </div>
                    <div class="stamp-label">{{ g[0] }}</div>
                    <div class="stamp-sub">{{ g[1] }} animes</div>
                  </div>
                }
              </div>
            </div>

            <div class="card-footer">
              <div class="brand">MediaTracker</div>
              <div class="url">media-tracker.app/recap</div>
            </div>
          </div>
        </div>

        <div class="share-actions">
           <button class="action-circle-btn" (click)="back.emit()" title="Voltar">
              <lucide-icon [img]="BackIcon" [size]="20"></lucide-icon>
           </button>
           
           <button class="download-btn" (click)="download.emit()" [disabled]="isGenerating">
              <lucide-icon [img]="DownloadIcon" [size]="20"></lucide-icon>
              {{ isGenerating ? 'Gerando...' : 'Download' }}
           </button>

           <button class="action-circle-btn close" (click)="close.emit()" title="Fechar">
              <lucide-icon [img]="ShareIcon" [size]="20"></lucide-icon>
           </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-share-slide.scss'
})
export class RecapShareSlideComponent {
  @Input({ required: true }) year!: number;
  @Input({ required: true }) topAnime: Anime[] = [];
  @Input({ required: true }) topStudios: [string, number][] = [];
  @Input({ required: true }) topGenres: [string, number][] = [];
  @Input() isGenerating: boolean = false;

  @Output() download = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  @ViewChild('recapCard') recapCardRef!: ElementRef;

  readonly DownloadIcon = Download;
  readonly ShareIcon = Share2;
  readonly BackIcon = ArrowLeft;
  readonly ZapIcon = Zap;

  getGenreIcon(genre: string): any {
    const map: Record<string, any> = {
      'Action': Sword,
      'Adventure': Rocket,
      'Comedy': PartyPopper,
      'Drama': Heart,
      'Fantasy': Wand2,
      'Romance': Heart,
      'Sci-Fi': Rocket,
      'Slice of Life': Trees,
      'Supernatural': Ghost,
      'Thriller': Brain,
      'Horror': Ghost,
      'Mystery': HelpCircle,
      'Sports': Footprints
    };
    return map[genre] || Music;
  }
}
