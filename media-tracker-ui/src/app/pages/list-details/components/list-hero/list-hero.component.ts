import { Component, input, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ListDetails } from '../../../../models/list.model';

@Component({
  selector: 'app-list-hero',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './list-hero.component.html',
  styleUrl: './list-hero.component.scss'
})
export class ListHeroComponent implements OnInit, OnDestroy {
  list = input<ListDetails | null | undefined>(null);
  
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;

  currentSlide = signal(0);
  private slideInterval: any;

  ngOnInit() {
    this.startAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  private startAutoSlide() {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private stopAutoSlide() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  nextSlide() {
    const listData = this.list();
    const itemCount = listData?.mediaItems?.length || 0;
    if (itemCount === 0) return;
    this.currentSlide.update(i => (i + 1) % itemCount);
  }

  prevSlide() {
    const listData = this.list();
    const itemCount = listData?.mediaItems?.length || 0;
    if (itemCount === 0) return;
    this.currentSlide.update(i => (i - 1 + itemCount) % itemCount);
  }

  setSlide(index: number) {
    this.currentSlide.set(index);
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}
