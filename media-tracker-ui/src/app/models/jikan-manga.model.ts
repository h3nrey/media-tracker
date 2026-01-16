// Response from Jikan API (MyAnimeList Manga)
export interface JikanMangaSearchResponse {
  data: JikanManga[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface JikanManga {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
    webp: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
  };
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  chapters?: number;
  volumes?: number;
  status?: string;
  publishing: boolean;
  published?: {
    from?: string;
    to?: string;
    prop?: {
      from?: {
        day?: number;
        month?: number;
        year?: number;
      };
      to?: {
        day?: number;
        month?: number;
        year?: number;
      };
    };
  };
  score?: number;
  genres?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  authors?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  serializations?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  themes?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  demographics?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  synopsis?: string;
}
