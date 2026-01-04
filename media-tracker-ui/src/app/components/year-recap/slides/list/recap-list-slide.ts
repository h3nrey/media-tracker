import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recap-list-slide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slide list-slide">
      <div class="content-wrapper">
        <h2 class="slide-title">{{ title }}</h2>
        
        <div class="list-container">
          @if (items.length > 0) {
            <!-- TOP 1 Entry (Large and centered) -->
            <div class="top-entry">
              <div class="entry-circle">
                <span class="rank">1</span>
                <span class="name">{{ items[0][0] }}</span>
                <span class="count">{{ items[0][1] }} animes</span>
              </div>
            </div>

            <!-- Other entries (smaller) -->
            <div class="other-entries">
              @for (item of items.slice(1); track item[0]; let i = $index) {
                <div class="mini-entry" [style.animation-delay]="(i * 0.1 + 1.2) + 's'">
                  <span class="rank">#{{ i + 2 }}</span>
                  <span class="name">{{ item[0] }}</span>
                  <span class="count">{{ item[1] }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './recap-list-slide.scss'
})
export class RecapListSlideComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) items: [string, number][] = [];
}
