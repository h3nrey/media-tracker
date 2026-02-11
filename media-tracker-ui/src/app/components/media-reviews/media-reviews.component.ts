import { Component, input, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Star, MessageSquare, Plus, Trash2, Edit2 } from 'lucide-angular';
import { ReviewService } from '../../services/review.service';
import { MediaReview } from '../../models/review.model';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-media-reviews',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './media-reviews.component.html',
  styleUrl: './media-reviews.component.scss'
})
export class MediaReviewsComponent {
  supabaseId = input<number | undefined>();
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  reviews = signal<MediaReview[]>([]);
  isAddingReview = signal(false);
  editingReview = signal<MediaReview | null>(null);

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
    this.reviewService.getReviewsByMediaId$(id).subscribe((data: MediaReview[]) => {
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
      media_item_id: id,
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

  editReview(review: MediaReview) {
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
    // This part might need adjustment if routes change, 
    // but for now it's fine for anime. For games, we might need a dynamic path.
    // However, the user didn't ask for full review pages yet.
    /*
    const animeId = this.supabaseId();
    if (animeId) {
      this.router.navigate(['/anime', animeId, 'reviews', id]);
    }
    */
  }
}
