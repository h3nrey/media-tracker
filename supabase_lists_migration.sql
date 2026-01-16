-- Migration to update lists table with media_type_id and media_item_ids
-- Run this in your Supabase SQL Editor

-- 1. Add media_type_id to link lists with specific media categories
-- Possible values from app state: 1 (Anime), 2 (Manga), 3 (Games), 4 (Movies), NULL (Universal)
ALTER TABLE lists 
ADD COLUMN IF NOT EXISTS media_type_id INTEGER;

-- 2. Add media_item_ids to support the generic media structure (replacing/complementing anime_ids)
ALTER TABLE lists 
ADD COLUMN IF NOT EXISTS media_item_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[];

-- 3. Create index for media_type_id to optimize filtered collection views
CREATE INDEX IF NOT EXISTS idx_lists_media_type_id ON lists(media_type_id);

ALTER TABLE lists
DROP COLUMN IF EXISTS anime_ids;

-- Optional: Migrate existing lists to default to Anime if they have anime entries
-- UPDATE lists SET media_type_id = 1 WHERE media_type_id IS NULL AND array_length(anime_ids, 1) > 0;
