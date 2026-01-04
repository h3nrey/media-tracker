import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Music, Ghost, Flame, Rocket, Heart, Sword, PartyPopper, Brain, Trees, Footprints, Wand2, HelpCircle } from 'lucide-angular';

@Component({
  selector: 'app-recap-genres-slide',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="slide genres-slide">
      <div class="content-wrapper">
        <h2 class="slide-title">Seus gêneros mais assistidos foram</h2>
        
        <div class="genre-showcase" *ngIf="genres.length > 0">
          <!-- TOP 1 -->
          <div class="main-genre">
            <div class="rank-indicator">1</div>
            <div class="stamp-box">
              <div class="stamp-border"></div>
              <div class="genre-image">
                <lucide-icon [img]="getGenreIcon(genres[0][0])" [size]="80"></lucide-icon>
              </div>
              <div class="genre-label">{{ genres[0][0] }}</div>
            </div>
            <div class="percentage">{{ getPercentage(genres[0][1]) }}%</div>
          </div>

          <!-- TOP 2-5 -->
          <div class="other-genres">
            @for (item of genres.slice(1, 5); track item[0]; let i = $index) {
              <div class="mini-genre">
                <div class="mini-rank">{{ i + 2 }}</div>
                <div class="mini-box">
                  <lucide-icon [img]="getGenreIcon(item[0])" [size]="32"></lucide-icon>
                  <div class="meta">
                    <span class="name">{{ item[0] }}</span>
                    <span class="perc">{{ getPercentage(item[1]) }}%</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-genres-slide.scss'
})
export class RecapGenresSlideComponent {
  @Input({ required: true }) genres: [string, number][] = [];
  @Input({ required: true }) totalAnime: number = 0;

  getPercentage(count: number): number {
    return Math.round((count / this.totalAnime) * 100);
  }

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
