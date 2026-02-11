import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { MediaReview } from '../models/review.model';
import { from, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private supabase = inject(SupabaseService);

  getReviewsByMediaId$(mediaItemId: number): Observable<MediaReview[]> {
    return from(
      this.supabase.client
        .from('media_reviews')
        .select('*')
        .eq('media_item_id', mediaItemId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => response.data || [])
    );
  }

  getReviewsForMediaList$(mediaItemIds: number[]): Observable<MediaReview[]> {
    return from(
      this.supabase.client
        .from('media_reviews')
        .select('*')
        .in('media_item_id', mediaItemIds)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => response.data || [])
    );
  }

  getReviewById$(id: number): Observable<MediaReview | null> {
    return from(
      this.supabase.client
        .from('media_reviews')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => response.data || null)
    );
  }

  async addReview(review: Partial<MediaReview>) {
    const { data, error } = await this.supabase.client
      .from('media_reviews')
      .insert([review])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateReview(id: number, review: Partial<MediaReview>) {
    const { data, error } = await this.supabase.client
      .from('media_reviews')
      .update(review)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteReview(id: number) {
    const { error } = await this.supabase.client
      .from('media_reviews')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Legacy support for migrations
  getReviewsByAnimeId$(animeId: number) {
    return this.getReviewsByMediaId$(animeId);
  }
}
