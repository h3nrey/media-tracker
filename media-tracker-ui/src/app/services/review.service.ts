import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AnimeReview } from '../models/review.model';
import { from, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private supabase = inject(SupabaseService);

  getReviewsByAnimeId$(animeId: number): Observable<AnimeReview[]> {
    return from(
      this.supabase.client
        .from('anime_reviews')
        .select('*')
        .eq('anime_id', animeId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => response.data || [])
    );
  }

  getReviewById$(id: number): Observable<AnimeReview | null> {
    return from(
      this.supabase.client
        .from('anime_reviews')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => response.data || null)
    );
  }

  async addReview(review: Partial<AnimeReview>) {
    const { data, error } = await this.supabase.client
      .from('anime_reviews')
      .insert([review])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateReview(id: number, review: Partial<AnimeReview>) {
    const { data, error } = await this.supabase.client
      .from('anime_reviews')
      .update(review)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteReview(id: number) {
    const { error } = await this.supabase.client
      .from('anime_reviews')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
