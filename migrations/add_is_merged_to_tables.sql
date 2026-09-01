-- Migration: Add is_merged field to tables
-- Version: 2.1
-- Date: 2026-05-07
-- Description: Add is_merged boolean field to track merged tables for split functionality

-- Add is_merged column to tables table
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN public.tables.is_merged IS 'Indicates if this table has been merged from other tables';

-- Update schema version
INSERT INTO public.schema_version (version, description) VALUES
  ('2.1', 'Added is_merged field to tables for split table functionality')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());
