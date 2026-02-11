import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReviewService } from '../../services/review.service';
import { MediaReview } from '../../models/review.model';
import { LucideAngularModule, X, Calendar, User, MessageSquare } from 'lucide-angular';
import { AnimeService } from '../../services/anime.service';
import { Anime } from '../../models/anime.model';

@Component({
  selector: 'app-review-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './review-detail.component.html',
  styleUrl: './review-detail.component.scss'
})
export class ReviewDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reviewService = inject(ReviewService);
  private animeService = inject(AnimeService);

  review = signal<MediaReview | null>(null);
  anime = signal<Anime | null>(null);
  
  readonly XIcon = X;
  readonly CalendarIcon = Calendar;
  readonly UserIcon = User;
  readonly QuoteIcon = MessageSquare;

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadReview(id);
      }
    });
  }

  async loadReview(id: number) {
    this.reviewService.getReviewById$(id).subscribe(async r => {
      if (r) {
        this.review.set(r);
        const animeData = await this.animeService.getAnimeBySupabaseId(r.media_item_id);
        if (animeData) {
          this.anime.set(animeData);
        }
      }
    });
  }

  getParts(text: string) {
    if (!text) return { title: '', body: '' };
    const lines = text.split('\n');
    return {
      title: lines[0] || '',
      body: lines.slice(1).join('\n')
    };
  }

  close() {
    // If we have history, go back; otherwise go to home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
