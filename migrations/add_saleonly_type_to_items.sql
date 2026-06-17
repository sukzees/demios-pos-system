-- Migration: Add 'saleonly' to items type check constraint
-- This allows items table to have type = 'saleonly' for Sale Only items

-- Step 1: Drop the existing type check constraint
ALTER TABLE public.items 
DROP CONSTRAINT IF EXISTS items_type_check;

-- Step 2: Add new constraint that includes 'saleonly'
ALTER TABLE public.items 
ADD CONSTRAINT items_type_check CHECK (
  type IS NULL OR type IN ('standalone', 'saleonly')
);

-- Note: 
-- - 'standalone' = menu items linked to inventory_items
-- - 'saleonly' = menu items without inventory tracking (unlimited stock)
-- - NULL = legacy items without type classification
