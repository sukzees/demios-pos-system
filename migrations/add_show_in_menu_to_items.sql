-- Migration: Add show_in_menu field to items table
-- Date: 2026-05-14
-- Purpose: Separate Inventory items from Menu items

-- Step 1: Add the column
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT false;

-- Step 2: Update existing items to show in menu (preserve current behavior)
UPDATE items 
SET show_in_menu = true 
WHERE show_in_menu IS NULL OR show_in_menu = false;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_show_in_menu ON items(show_in_menu);

-- Step 4: Add comment to describe the column
COMMENT ON COLUMN items.show_in_menu IS 'Whether this item should be displayed in the menu and POS. false = Inventory only, true = Show in menu';
