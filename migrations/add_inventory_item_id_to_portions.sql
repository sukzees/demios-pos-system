-- Migration: Add support for inventory_items in item_portions table
-- This allows inventory items to have portions/sizes

-- Step 1: Add inventory_item_id column to item_portions
ALTER TABLE public.item_portions 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE;

-- Step 2: Drop the old constraint that only allows item_id OR recipe_id
ALTER TABLE public.item_portions 
DROP CONSTRAINT IF EXISTS check_item_or_recipe;

-- Step 3: Add new constraint that allows item_id, recipe_id, OR inventory_item_id (but only one)
ALTER TABLE public.item_portions 
ADD CONSTRAINT check_item_recipe_or_inventory CHECK (
  (item_id IS NOT NULL AND recipe_id IS NULL AND inventory_item_id IS NULL) OR
  (item_id IS NULL AND recipe_id IS NOT NULL AND inventory_item_id IS NULL) OR
  (item_id IS NULL AND recipe_id IS NULL AND inventory_item_id IS NOT NULL)
);

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_portions_inventory_item_id 
ON public.item_portions(inventory_item_id);
