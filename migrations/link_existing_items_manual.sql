-- ============================================
-- Manual Migration: Review and Link Items to Inventory
-- Description: Review existing standalone items and link them manually
-- Version: 2.6
-- Date: 2026-06-16
-- ============================================

-- STEP 1: Review all standalone items that need linking
-- ============================================
SELECT 
  i.id as item_id,
  i.name as item_name,
  i.type,
  i.inventory_category_id,
  i.inventory_item_id,
  ic.name as inventory_category_name
FROM public.items i
LEFT JOIN public.inventory_categories ic ON i.inventory_category_id = ic.id
WHERE i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
ORDER BY i.name;

-- STEP 2: Find matching inventory items
-- ============================================
-- This shows potential matches between items and inventory_items
SELECT 
  i.id as item_id,
  i.name as item_name,
  ii.id as inventory_item_id,
  ii.name as inventory_item_name,
  ii.type as inventory_type,
  ii.stock,
  CASE 
    WHEN i.id = ii.id THEN 'Same ID ✓'
    WHEN i.name = ii.name AND i.inventory_category_id = ii.inventory_category_id THEN 'Name + Category Match ✓'
    WHEN i.name = ii.name THEN 'Name Match Only'
    ELSE 'No Match'
  END as match_type
FROM public.items i
LEFT JOIN public.inventory_items ii ON (
  i.name = ii.name 
  OR i.id = ii.id
)
WHERE i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND ii.type = 'standalone'
ORDER BY i.name, match_type;

-- STEP 3: Automatic Link by Same ID
-- ============================================
-- Run this to link items that have the same ID as inventory_items
-- This is the safest automatic approach

-- PREVIEW (run this first to see what will be updated):
SELECT 
  i.id,
  i.name,
  'Will link to inventory_item: ' || i.id as action
FROM public.items i
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.inventory_items ii 
    WHERE ii.id = i.id AND ii.type = 'standalone'
  );

-- EXECUTE (uncomment to run):
-- UPDATE public.items i
-- SET inventory_item_id = i.id
-- WHERE 
--   i.type = 'standalone' 
--   AND i.inventory_item_id IS NULL
--   AND EXISTS (
--     SELECT 1 FROM public.inventory_items ii 
--     WHERE ii.id = i.id AND ii.type = 'standalone'
--   );

-- STEP 4: Manual Link by Name and Category
-- ============================================
-- For items that don't have same ID but match by name and category

-- PREVIEW:
SELECT 
  i.id as item_id,
  i.name,
  ii.id as will_link_to_inventory_id,
  ii.name as inventory_name
FROM public.items i
JOIN public.inventory_items ii ON (
  i.name = ii.name 
  AND i.inventory_category_id = ii.inventory_category_id
  AND ii.type = 'standalone'
)
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL;

-- EXECUTE (uncomment to run):
-- UPDATE public.items i
-- SET inventory_item_id = ii.id
-- FROM public.inventory_items ii
-- WHERE 
--   i.type = 'standalone' 
--   AND i.inventory_item_id IS NULL
--   AND i.name = ii.name
--   AND i.inventory_category_id = ii.inventory_category_id
--   AND ii.type = 'standalone';

-- STEP 5: Manual Link for Specific Items
-- ============================================
-- Use this template to manually link specific items
-- Replace the IDs with actual values from STEP 2

-- Example:
-- UPDATE public.items 
-- SET inventory_item_id = 'actual-inventory-item-id-here'
-- WHERE id = 'actual-item-id-here';

-- STEP 6: Verification
-- ============================================
-- After running updates, verify the results

-- Count linked vs unlinked
SELECT 
  COUNT(*) as total_standalone,
  COUNT(inventory_item_id) as linked,
  COUNT(*) - COUNT(inventory_item_id) as unlinked
FROM public.items
WHERE type = 'standalone';

-- Show all standalone items with their links
SELECT 
  i.id as item_id,
  i.name as menu_name,
  i.price as menu_price,
  i.inventory_item_id,
  ii.name as inventory_name,
  ii.stock,
  ii.cost_price
FROM public.items i
LEFT JOIN public.inventory_items ii ON i.inventory_item_id = ii.id
WHERE i.type = 'standalone'
ORDER BY i.name;

-- Show remaining unlinked items
SELECT 
  id,
  name,
  type,
  inventory_category_id,
  'NEEDS MANUAL LINKING' as status
FROM public.items
WHERE type = 'standalone' 
  AND inventory_item_id IS NULL;
