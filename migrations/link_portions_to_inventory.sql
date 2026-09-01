-- Migration: Link existing item_portions to inventory_items
-- Description: Update item_portions.inventory_item_id based on items.inventory_item_id
-- Date: 2026-06-17

-- Step 1: Link portions to inventory items for standalone items
UPDATE item_portions ip
SET inventory_item_id = i.inventory_item_id
FROM items i
WHERE ip.item_id = i.id
  AND i.type = 'standalone'
  AND i.inventory_item_id IS NOT NULL
  AND ip.inventory_item_id IS NULL;

-- Step 2: Clear conflicting foreign keys to avoid constraint violations
-- Only one of (item_id, recipe_id, inventory_item_id) should be set
UPDATE item_portions
SET item_id = NULL
WHERE inventory_item_id IS NOT NULL
  AND item_id IS NOT NULL;

-- Step 3: Verification - show results
SELECT 
  'Portions linked to inventory' as description,
  COUNT(*) as count
FROM item_portions 
WHERE inventory_item_id IS NOT NULL

UNION ALL

SELECT 
  'Portions linked to items' as description,
  COUNT(*) as count
FROM item_portions 
WHERE item_id IS NOT NULL

UNION ALL

SELECT 
  'Portions linked to recipes' as description,
  COUNT(*) as count
FROM item_portions 
WHERE recipe_id IS NOT NULL;

-- Step 4: Show portion details with their linked entities
SELECT 
  ip.id,
  ip.portion_name,
  ip.portion_price,
  ip.portion_cost_price,
  ip.portion_stock,
  CASE 
    WHEN ip.inventory_item_id IS NOT NULL THEN 'inventory_items'
    WHEN ip.item_id IS NOT NULL THEN 'items'
    WHEN ip.recipe_id IS NOT NULL THEN 'recipes'
    ELSE 'unlinked'
  END as linked_to,
  COALESCE(
    (SELECT name FROM inventory_items WHERE id = ip.inventory_item_id),
    (SELECT name FROM items WHERE id = ip.item_id),
    (SELECT name FROM recipes WHERE id = ip.recipe_id),
    'N/A'
  ) as parent_name
FROM item_portions ip
ORDER BY parent_name, ip.portion_name;

-- Step 5: Summary
DO $$
DECLARE
  total_portions INTEGER;
  linked_portions INTEGER;
  unlinked_portions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_portions FROM item_portions;
  SELECT COUNT(*) INTO linked_portions FROM item_portions 
    WHERE inventory_item_id IS NOT NULL OR item_id IS NOT NULL OR recipe_id IS NOT NULL;
  SELECT COUNT(*) INTO unlinked_portions FROM item_portions 
    WHERE inventory_item_id IS NULL AND item_id IS NULL AND recipe_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PORTION LINKING SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total portions: %', total_portions;
  RAISE NOTICE 'Linked portions: %', linked_portions;
  RAISE NOTICE 'Unlinked portions: %', unlinked_portions;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
