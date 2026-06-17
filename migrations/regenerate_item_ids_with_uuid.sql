-- Migration: Regenerate all existing item IDs with new UUIDs
-- ⚠️ WARNING: This will change all item IDs and update related foreign keys
-- Make sure to BACKUP your database before running this migration!

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create a temporary mapping table to store old and new IDs
CREATE TEMP TABLE item_id_mapping (
    old_id TEXT PRIMARY KEY,
    new_id UUID DEFAULT uuid_generate_v4()
);

-- Step 3: Insert all current item IDs into mapping table
INSERT INTO item_id_mapping (old_id)
SELECT id::TEXT FROM items;

-- Step 4: Disable triggers temporarily (to avoid constraint violations during update)
ALTER TABLE order_items DISABLE TRIGGER ALL;
ALTER TABLE recipe_ingredients DISABLE TRIGGER ALL;
ALTER TABLE item_portions DISABLE TRIGGER ALL;
ALTER TABLE inventory_transactions DISABLE TRIGGER ALL;

-- Step 5: Add temporary new_id column to items table
ALTER TABLE items ADD COLUMN new_id UUID;

-- Step 6: Populate new_id with UUID from mapping
UPDATE items i
SET new_id = m.new_id
FROM item_id_mapping m
WHERE i.id = m.old_id;

-- Step 7: Update foreign key references in order_items
ALTER TABLE order_items ADD COLUMN new_item_id UUID;

UPDATE order_items oi
SET new_item_id = m.new_id
FROM item_id_mapping m
WHERE oi.item_id = m.old_id;

-- Step 8: Update foreign key references in recipe_ingredients
ALTER TABLE recipe_ingredients ADD COLUMN new_ingredient_id UUID;

UPDATE recipe_ingredients ri
SET new_ingredient_id = m.new_id
FROM item_id_mapping m
WHERE ri.ingredient_id = m.old_id;

-- Step 9: Update foreign key references in item_portions
ALTER TABLE item_portions ADD COLUMN new_item_id UUID;

UPDATE item_portions ip
SET new_item_id = m.new_id
FROM item_id_mapping m
WHERE ip.item_id = m.old_id;

-- Step 10: Update foreign key references in inventory_transactions
ALTER TABLE inventory_transactions ADD COLUMN new_item_id UUID;

UPDATE inventory_transactions it
SET new_item_id = m.new_id
FROM item_id_mapping m
WHERE it.item_id = m.old_id;

-- Step 11: Drop old foreign key constraints
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_item_id_fkey;
ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_ingredient_id_fkey;
ALTER TABLE item_portions DROP CONSTRAINT IF EXISTS item_portions_item_id_fkey;
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_item_id_fkey;

-- Step 12: Drop old primary key and rename columns in items table
ALTER TABLE items DROP CONSTRAINT items_pkey;
ALTER TABLE items DROP COLUMN id;
ALTER TABLE items RENAME COLUMN new_id TO id;
ALTER TABLE items ADD PRIMARY KEY (id);

-- Step 13: Rename and update columns in related tables
-- order_items
ALTER TABLE order_items DROP COLUMN item_id;
ALTER TABLE order_items RENAME COLUMN new_item_id TO item_id;

-- recipe_ingredients
ALTER TABLE recipe_ingredients DROP COLUMN ingredient_id;
ALTER TABLE recipe_ingredients RENAME COLUMN new_ingredient_id TO ingredient_id;

-- item_portions
ALTER TABLE item_portions DROP COLUMN item_id;
ALTER TABLE item_portions RENAME COLUMN new_item_id TO item_id;

-- inventory_transactions
ALTER TABLE inventory_transactions DROP COLUMN item_id;
ALTER TABLE inventory_transactions RENAME COLUMN new_item_id TO item_id;

-- Step 14: Re-create foreign key constraints
ALTER TABLE order_items 
ADD CONSTRAINT order_items_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE recipe_ingredients 
ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey 
FOREIGN KEY (ingredient_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE item_portions 
ADD CONSTRAINT item_portions_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT inventory_transactions_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- Step 15: Re-enable triggers
ALTER TABLE order_items ENABLE TRIGGER ALL;
ALTER TABLE recipe_ingredients ENABLE TRIGGER ALL;
ALTER TABLE item_portions ENABLE TRIGGER ALL;
ALTER TABLE inventory_transactions ENABLE TRIGGER ALL;

-- Step 16: Set default UUID generation for future inserts
ALTER TABLE items ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 17: Recreate indexes if needed
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_item_portions_item_id ON item_portions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);

-- Verification query (run after migration)
-- SELECT 
--   'items' as table_name, 
--   COUNT(*) as total_records,
--   COUNT(CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuids
-- FROM items;

COMMENT ON COLUMN items.id IS 'Auto-generated UUID primary key (regenerated on migration date)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully! All item IDs have been regenerated with UUIDs.';
END $$;
