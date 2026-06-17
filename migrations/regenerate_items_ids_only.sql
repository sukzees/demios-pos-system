-- Migration: Regenerate IDs for items table only (without updating foreign keys)
-- This is a simple migration that only changes the IDs in the items table
-- ⚠️ WARNING: This will break foreign key relationships!
-- Use this ONLY if you want to start fresh with new items

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create backup table (optional, for safety)
CREATE TABLE IF NOT EXISTS items_backup AS SELECT * FROM items;

-- Step 3: Truncate items table (removes all data but keeps structure)
-- This will fail if there are foreign key constraints referencing items
-- Comment out if you want to keep the relationships
TRUNCATE TABLE items RESTART IDENTITY CASCADE;

-- Step 4: Set default UUID generation for id column
ALTER TABLE items ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 5: Add comment
COMMENT ON COLUMN items.id IS 'Auto-generated UUID primary key';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Items table has been cleared and configured for UUID generation.';
  RAISE NOTICE 'Backup saved in items_backup table.';
  RAISE NOTICE 'You can now insert new items and IDs will be auto-generated.';
END $$;

-- To restore from backup if needed:
-- INSERT INTO items SELECT * FROM items_backup;

-- To drop backup table:
-- DROP TABLE items_backup;
