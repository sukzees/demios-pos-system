-- ============================================
-- Migration: Migrate existing inventory items from items to inventory_items table
-- Version: 2.4.1
-- Date: 2026-06-15
-- Description: This script migrates all existing items that belong to Inventory 
--              (items with inventory_category_id) to the new inventory_items table
-- ============================================

-- Step 1: Backup existing items before migration (optional but recommended)
-- CREATE TABLE IF NOT EXISTS items_backup_20260615 AS SELECT * FROM public.items;

-- Step 2: Insert inventory items into inventory_items table
-- These are items that have inventory_category_id set (indicating they're inventory items)
INSERT INTO public.inventory_items (
  id,
  name,
  price,
  cost_price,
  min_stock,
  inventory_category_id,
  image_url,
  stock,
  unit,
  type,
  created_at
)
SELECT 
  id,
  name,
  price,
  COALESCE(cost_price, price) as cost_price,
  COALESCE(min_stock, 10) as min_stock,
  inventory_category_id,
  image_url,
  COALESCE(stock, 0) as stock,
  'pcs' as unit,
  CASE 
    WHEN is_recipe = true OR is_recipe IS NULL THEN 'standalone'::TEXT
    ELSE 'ingredient'::TEXT
  END as type,
  created_at
FROM public.items
WHERE inventory_category_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  min_stock = EXCLUDED.min_stock,
  inventory_category_id = EXCLUDED.inventory_category_id,
  image_url = EXCLUDED.image_url,
  stock = EXCLUDED.stock,
  unit = EXCLUDED.unit,
  type = EXCLUDED.type,
  created_at = EXCLUDED.created_at;

-- Step 3: Also migrate item_portions for inventory items
-- Update item_portions references to point to inventory_items
-- (item_portions table uses item_id which works for both tables since we keep the same IDs)

-- Step 4: Display migration summary
DO $$
DECLARE
  migrated_count INTEGER;
  standalone_count INTEGER;
  ingredient_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count 
  FROM public.inventory_items;
  
  SELECT COUNT(*) INTO standalone_count 
  FROM public.inventory_items 
  WHERE type = 'standalone';
  
  SELECT COUNT(*) INTO ingredient_count 
  FROM public.inventory_items 
  WHERE type = 'ingredient';
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '- Total items migrated to inventory_items: %', migrated_count;
  RAISE NOTICE '- Standalone items: %', standalone_count;
  RAISE NOTICE '- Ingredient items: %', ingredient_count;
END $$;

-- Step 5: Optional - Remove migrated items from items table
-- WARNING: Only uncomment this after verifying the migration was successful
-- This will permanently delete inventory items from the items table

/*
DELETE FROM public.items 
WHERE inventory_category_id IS NOT NULL;

RAISE NOTICE 'Inventory items removed from items table';
*/

-- Step 6: Update schema version
INSERT INTO public.schema_version (version, description) VALUES
  ('2.4.1', 'Migrated existing inventory items from items table to inventory_items table')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());

-- ============================================
-- Verification Queries (Run these to verify migration)
-- ============================================

-- Check total items in inventory_items
-- SELECT COUNT(*) as total_inventory_items FROM public.inventory_items;

-- Check items by type
-- SELECT type, COUNT(*) as count FROM public.inventory_items GROUP BY type;

-- Check items with portions
-- SELECT ii.name, ii.type, COUNT(ip.id) as portion_count
-- FROM public.inventory_items ii
-- LEFT JOIN public.item_portions ip ON ip.item_id = ii.id
-- GROUP BY ii.id, ii.name, ii.type
-- HAVING COUNT(ip.id) > 0;

-- Check remaining items in items table (should only be menu items)
-- SELECT COUNT(*) as remaining_items_count FROM public.items;
-- SELECT * FROM public.items LIMIT 10;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- If something goes wrong, you can restore from backup:
-- DELETE FROM public.inventory_items;
-- INSERT INTO public.items SELECT * FROM items_backup_20260615;
-- DROP TABLE items_backup_20260615;
-- DELETE FROM public.schema_version WHERE version = '2.4.1';
