-- Migration: Add origin_table_id to order_items
-- Version: 2.4
-- Date: 2026-06-28
-- Description: Remember which table each order item originally belonged to, so that
--              splitting a merged table can send each item back to its original table.

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS origin_table_id TEXT;

COMMENT ON COLUMN public.order_items.origin_table_id IS 'Table id this item originally belonged to (used to split merged tables back)';

INSERT INTO public.schema_version (version, description) VALUES
  ('2.5', 'Added origin_table_id to order_items for splitting merged tables back to origin')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());

-- Refresh PostgREST schema cache so the API immediately sees the new column
NOTIFY pgrst, 'reload schema';
