import { Component, input, computed, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, MessageSquare, Star, Quote, ChevronLeft, ChevronRight, Calendar } from 'lucide-angular';
import { MediaItem, MediaType } from '../../../../models/media-type.model';
import { MediaService } from '../../../../services/media.service';
import { MediaReview } from '../../../../models/review.model';
import { getScoreColorClass } from '../../../../utils/anime-utils';

@Component({
  selector: 'app-stats-reviews',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './stats-reviews.component.html',
  styleUrl: './stats-reviews.component.scss'
})
export class StatsReviewsComponent {
  mediaList = input.required<MediaItem[]>();
  readonly MessageIcon = MessageSquare;
  readonly StarIcon = Star;
  readonly QuoteIcon = Quote;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly CalendarIcon = Calendar;

  currentIndex = signal(1);
  isTransitionEnabled = signal(true);
  private isJumping = false;
  
  mergedReviews = computed(() => {
    const list = this.mediaList();
    const allWrapped: ReviewStatsItem[] = [];

    list.forEach(media => {
      if (media.reviews) {
        media.reviews.forEach(review => {
          allWrapped.push({ review, media });
        });
      }
    });
    return allWrapped;
  });

  displayReviews = computed(() => {
    const r = this.mergedReviews();
    if (r.length <= 1) return r;
    return [r[r.length - 1], ...r, r[0]];
  });

  constructor() {
    effect(() => {
      const reviews = this.mergedReviews();
      
      this.currentIndex.set(reviews.length > 1 ? 1 : 0);
      this.isTransitionEnabled.set(false);
    }, { allowSignalWrites: true });
  }

  next() {
    const originalCount = this.mergedReviews().length;
    if (originalCount <= 1 || this.isJumping) return;
    
    this.isTransitionEnabled.set(true);
    this.currentIndex.update((i: number) => i + 1);
    
    if (this.currentIndex() === this.displayReviews().length - 1) {
      this.handleJump(1);
    }
  }

  prev() {
    const originalCount = this.mergedReviews().length;
    if (originalCount <= 1 || this.isJumping) return;

    this.isTransitionEnabled.set(true);
    this.currentIndex.update((i: number) => i - 1);

    if (this.currentIndex() === 0) {
      this.handleJump(this.displayReviews().length - 2);
    }
  }

  private handleJump(targetIndex: number) {
    this.isJumping = true;
    setTimeout(() => {
      this.isTransitionEnabled.set(false);
      this.currentIndex.set(targetIndex);
      setTimeout(() => {
        this.isJumping = false;
      }, 50);
    }, 600);
  }

  getScoreClass(score: number): string {
    return getScoreColorClass(score);
  }

  getDetailUrl(item: MediaItem): string {
    if (!item) return '/';
    if (item.mediaTypeId === MediaType.ANIME) {
      return `/anime/${item.id}`;
    } else if (item.mediaTypeId === MediaType.GAME) {
      return `/game/${item.id}`;
    }
    return `/media/${item.id}`;
  }
}

export interface ReviewStatsItem {
  review: MediaReview;
  media: MediaItem;
}
