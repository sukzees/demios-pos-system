-- Migration: Restore Items from Backup with New UUIDs
-- Description: Migrate data from items_backup back to items table with newly generated UUIDs
-- Date: 2026-06-17

-- Step 1: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Ensure items table has UUID auto-generation
ALTER TABLE items 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 3: Create a temporary mapping table to track old ID -> new ID
-- Drop first if exists from previous session
DROP TABLE IF EXISTS item_id_mapping;

CREATE TEMP TABLE item_id_mapping (
  old_id UUID,
  new_id UUID,
  item_name TEXT,
  PRIMARY KEY (old_id)
);

-- Step 4: Clear existing items (if any)
-- WARNING: This will delete all current items
TRUNCATE TABLE items CASCADE;

-- Step 5: Insert items from backup with new UUIDs
-- The DEFAULT keyword will trigger uuid_generate_v4()

-- First, create a numbered backup for reliable mapping
WITH numbered_backup AS (
  SELECT 
    id as old_id,
    name,
    price,
    category_id,
    is_recipe,
    type,
    inventory_item_id,
    image_url,
    created_at,
    show_in_menu,
    ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS FIRST, id) as row_num
  FROM items_backup
),
-- Insert with new IDs
inserted_items AS (
  INSERT INTO items (
    name,
    price,
    category_id,
    is_recipe,
    type,
    inventory_item_id,
    image_url,
    created_at,
    show_in_menu
  )
  SELECT 
    name,
    price,
    category_id,
    is_recipe,
    type,
    inventory_item_id,
    image_url,
    COALESCE(created_at, NOW()),
    COALESCE(show_in_menu, true)
  FROM numbered_backup
  ORDER BY row_num
  RETURNING id, name, created_at
),
-- Add row numbers to inserted items
numbered_inserted AS (
  SELECT 
    id as new_id,
    name,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS FIRST, id) as row_num
  FROM inserted_items
)
-- Map old IDs to new IDs by row number
INSERT INTO item_id_mapping (old_id, new_id, item_name)
SELECT 
  nb.old_id,
  ni.new_id,
  nb.name as item_name
FROM numbered_backup nb
JOIN numbered_inserted ni ON nb.row_num = ni.row_num;

-- Step 6: Display the ID mapping for reference
SELECT 
  old_id,
  new_id,
  item_name,
  '✓ Migrated' as status
FROM item_id_mapping
ORDER BY item_name;

-- Step 7: Summary report
DO $$
DECLARE
  backup_count INTEGER;
  items_count INTEGER;
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM items_backup;
  SELECT COUNT(*) INTO items_count FROM items;
  SELECT COUNT(*) INTO mapping_count FROM item_id_mapping;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Items in backup table: %', backup_count;
  RAISE NOTICE 'Items migrated: %', items_count;
  RAISE NOTICE 'ID mappings created: %', mapping_count;
  RAISE NOTICE '';
  
  IF items_count = backup_count AND mapping_count = backup_count THEN
    RAISE NOTICE '✓ SUCCESS: All items migrated successfully!';
  ELSE
    RAISE WARNING '⚠ WARNING: Item counts do not match. Please verify.';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Step 8: Update foreign key references (OPTIONAL - only if needed)
-- Uncomment the sections below if you need to update references in other tables

/*
-- Update order_items references
UPDATE order_items oi
SET item_id = m.new_id
FROM item_id_mapping m
WHERE oi.item_id = m.old_id;

-- Update recipe_ingredients references
UPDATE recipe_ingredients ri
SET ingredient_id = m.new_id
FROM item_id_mapping m
WHERE ri.ingredient_id = m.old_id;

-- Update item_portions references
UPDATE item_portions ip
SET item_id = m.new_id
FROM item_id_mapping m
WHERE ip.item_id = m.old_id;

RAISE NOTICE 'Foreign key references updated.';
*/

-- Step 9: Verification queries
-- Check if all items were migrated
SELECT 
  'Items in backup' as description,
  COUNT(*) as count
FROM items_backup

UNION ALL

SELECT 
  'Items migrated' as description,
  COUNT(*) as count
FROM items

UNION ALL

SELECT 
  'ID mappings created' as description,
  COUNT(*) as count
FROM item_id_mapping;

-- Note: The item_id_mapping temporary table will be available for the duration of this session
-- If you need to update other tables, do it now before disconnecting
-- Or export the mapping to a permanent table:

/*
-- Optional: Save mapping permanently
CREATE TABLE IF NOT EXISTS item_id_migration_log (
  old_id UUID,
  new_id UUID,
  item_name TEXT,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (old_id)
);

INSERT INTO item_id_migration_log (old_id, new_id, item_name)
SELECT old_id, new_id, item_name
FROM item_id_mapping;
*/
