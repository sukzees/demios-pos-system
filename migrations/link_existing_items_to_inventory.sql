-- ============================================
-- Migration: Link existing items to inventory_items
-- Description: Update inventory_item_id for standalone items that are already linked
-- Version: 2.6
-- Date: 2026-06-16
-- ============================================

-- Update items that have inventory_category_id (these are linked to inventory)
-- Match by name and inventory_category_id to find the corresponding inventory_item
UPDATE public.items i
SET inventory_item_id = ii.id
FROM public.inventory_items ii
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND i.inventory_category_id IS NOT NULL
  AND i.name = ii.name
  AND i.inventory_category_id = ii.inventory_category_id;

-- Alternative approach: Link by matching ID if they use same ID
-- (In case items were created with same ID as inventory_items)
UPDATE public.items i
SET inventory_item_id = i.id
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.inventory_items ii 
    WHERE ii.id = i.id
  );

-- ============================================
-- Verification Queries
-- ============================================

-- Check how many items were linked
SELECT 
  COUNT(*) as total_standalone_items,
  COUNT(inventory_item_id) as linked_items,
  COUNT(*) - COUNT(inventory_item_id) as unlinked_items
FROM public.items
WHERE type = 'standalone';

-- Show items with their inventory links
SELECT 
  i.id as item_id,
  i.name as item_name,
  i.inventory_item_id,
  ii.name as inventory_name,
  ii.stock as inventory_stock
FROM public.items i
LEFT JOIN public.inventory_items ii ON i.inventory_item_id = ii.id
WHERE i.type = 'standalone'
ORDER BY i.name;

-- Show unlinked standalone items (if any)
SELECT 
  id,
  name,
  inventory_category_id,
  type
FROM public.items
WHERE type = 'standalone' 
  AND inventory_item_id IS NULL;
