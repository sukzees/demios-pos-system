-- Migration: Remove stock column from items table
-- Stock will only be tracked in inventory_items table

-- Step 1: Drop stock column from items table
ALTER TABLE public.items 
DROP COLUMN IF EXISTS stock;

-- Note:
-- - Standalone items will get stock from inventory_items via inventory_item_id
-- - Sale Only items don't track stock (unlimited)
-- - Recipe items calculate stock from ingredients in inventory_items
-- - This simplifies the system and makes inventory_items the single source of truth for stock
