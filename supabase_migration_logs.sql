-- Create media_logs table
CREATE TABLE IF NOT EXISTS public.media_logs (
    id BIGSERIAL PRIMARY KEY,
    supabase_id uuid DEFAULT gen_random_uuid(), -- Not using this for primary, but for sync identification if needed
    media_item_id BIGINT REFERENCES public.media_items(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_logs_media_item_id ON public.media_logs(media_item_id);

-- Enable Row Level Security
ALTER TABLE public.media_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (modify as needed based on your auth setup)
-- Policy: Users can only see/edit their own logs via their media_items
CREATE POLICY "Users can manage their own logs" ON public.media_logs
    FOR ALL
    USING (
        media_item_id IN (
            SELECT id FROM public.media_items WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        media_item_id IN (
            SELECT id FROM public.media_items WHERE user_id = auth.uid()
        )
    );
