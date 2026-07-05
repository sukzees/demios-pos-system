-- Migration: Add merged_into field to tables
-- Version: 2.3
-- Date: 2026-06-28
-- Description: Track which table a source table was merged into, so the source table
--              can be hidden from the table list while the merge is active and restored
--              automatically once the target table is split or checked out.

-- Add merged_into column to tables table (stores the target table id)
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS merged_into TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.tables.merged_into IS 'ID of the table this table was merged into (hidden while target is_merged is true)';

-- Update schema version
INSERT INTO public.schema_version (version, description) VALUES
  ('2.3', 'Added merged_into field to tables to hide merged-away source tables')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());
