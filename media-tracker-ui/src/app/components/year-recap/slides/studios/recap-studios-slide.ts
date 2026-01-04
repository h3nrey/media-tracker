import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recap-studios-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide studios-slide">
      <div class="content-wrapper">
        <h2 class="slide-title">Este foi seu top 5 estúdios</h2>
        
        <div class="studios-showcase" *ngIf="studios.length > 0">
          <!-- TOP 1 -->
          <div class="main-studio">
            <div class="circle-wrap">
              <div class="stars-border"></div>
              <div class="rank-tag">1</div>
              <div class="studio-circle">
                 <div class="studio-initial">{{ studios[0][0].charAt(0) }}</div>
              </div>
            </div>
            <div class="studio-name">{{ studios[0][0] }}</div>
            <div class="studio-count">{{ studios[0][1] }} animes</div>
          </div>

          <!-- TOP 2-5 -->
          <div class="other-studios">
            @for (item of studios.slice(1, 5); track item[0]; let i = $index) {
              <div class="mini-studio">
                <div class="rank-mini">{{ i + 2 }}</div>
                <div class="circle-mini">
                  <div class="initial">{{ item[0].charAt(0) }}</div>
                </div>
                <div class="name-mini">{{ item[0] }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-studios-slide.scss'
})
export class RecapStudiosSlideComponent {
  @Input({ required: true }) studios: [string, number][] = [];
}
