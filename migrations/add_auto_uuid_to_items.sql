-- Migration: Add auto-generated UUID default for items table
-- This ensures all new items get a UUID automatically without manually specifying it

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add default UUID generation for items table
ALTER TABLE public.items 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verify the change
-- New inserts will now automatically generate a UUID for the id column
-- Example: INSERT INTO items (name, price, category_id) VALUES ('Test', 10.00, 'cat-id');
-- The id will be generated automatically

COMMENT ON COLUMN public.items.id IS 'Auto-generated UUID primary key';
