-- Migration: Add merged_tables field to tables
-- Version: 2.2
-- Date: 2026-06-28
-- Description: Store the table number(s) that were merged into this table so the UI
--              can display e.g. "Merged with 4". Stored as a comma-separated string.

-- Add merged_tables column to tables table
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS merged_tables TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.tables.merged_tables IS 'Comma-separated list of table numbers merged into this table';

-- Update schema version
INSERT INTO public.schema_version (version, description) VALUES
  ('2.2', 'Added merged_tables field to tables to show which tables were merged')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());
