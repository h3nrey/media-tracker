import { Component, input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star, MessageSquare, Plus, Trash2, Edit2 } from 'lucide-angular';
import { ReviewService } from '../../services/review.service';
import { AnimeReview } from '../../models/review.model';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-anime-reviews',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './anime-reviews.component.html',
  styleUrl: './anime-reviews.component.scss'
})
export class AnimeReviewsComponent {
  supabaseId = input<number | undefined>();
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  reviews = signal<AnimeReview[]>([]);
  isAddingReview = signal(false);
  editingReview = signal<AnimeReview | null>(null);

  // New review form
  newText = signal('');

  readonly ReviewIcon = MessageSquare;
  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly EditIcon = Edit2;

  constructor() {
    effect(() => {
      const id = this.supabaseId();
      if (id) {
        this.loadReviews(id);
      }
    });
  }

  private loadReviews(id: number) {
    this.reviewService.getReviewsByAnimeId$(id).subscribe((data: AnimeReview[]) => {
      this.reviews.set(data);
    });
  }

  getParts(text: string) {
    const lines = text.split('\n');
    return {
      title: lines[0] || '',
      body: lines.slice(1).join('\n')
    };
  }

  toggleAdd() {
    this.isAddingReview.update(v => !v);
    this.editingReview.set(null);
    this.resetForm();
  }

  resetForm() {
    this.newText.set('');
  }

  async saveReview() {
    const id = this.supabaseId();
    if (!id) return;

    const reviewData = {
      anime_id: id,
      review_text: this.newText()
    };

    try {
      if (this.editingReview()) {
        await this.reviewService.updateReview(this.editingReview()!.id, reviewData);
      } else {
        await this.reviewService.addReview(reviewData);
      }
      this.loadReviews(id);
      this.isAddingReview.set(false);
      this.editingReview.set(null);
      this.resetForm();
    } catch (err: any) {
      console.error('Error saving review:', err);
    }
  }

  editReview(review: AnimeReview) {
    this.editingReview.set(review);
    this.newText.set(review.review_text);
    this.isAddingReview.set(true);
  }

  async deleteReview(id: number) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await this.reviewService.deleteReview(id);
      const supabaseId = this.supabaseId();
      if (supabaseId) this.loadReviews(supabaseId);
    } catch (err: any) {
      console.error('Error deleting review:', err);
    }
  }

  openReview(id: number) {
    const animeId = this.supabaseId();
    if (animeId) {
      this.router.navigate(['/anime', animeId, 'reviews', id]);
    }
  }
}
