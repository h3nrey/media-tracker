export interface MediaReview {
  id: number;
  media_item_id: number;
  review_text: string;
  created_at: string;
  updated_at: string;
}

// Keep this for backward compatibility if needed, but we should refactor
export interface AnimeReview extends MediaReview {
  anime_id: number;
}
