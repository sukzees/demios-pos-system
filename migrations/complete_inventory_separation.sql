-- ============================================
-- Complete Migration: Inventory Separation (All-in-One)
-- Version: 2.4 Complete
-- Date: 2026-06-15
-- Description: Complete migration that creates inventory_items table 
--              and migrates existing data in one go
-- ============================================

-- STEP 1: Create inventory_items table
-- ============================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  min_stock INTEGER DEFAULT 10,
  inventory_category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  type TEXT CHECK (type IN ('standalone', 'ingredient')) DEFAULT 'ingredient',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STEP 2: Add type column to items table
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'items' AND column_name = 'type') THEN
    ALTER TABLE public.items 
    ADD COLUMN type TEXT CHECK (type IN ('standalone', 'recipe', 'saleOnly')) DEFAULT 'recipe';
  END IF;
END $$;

-- STEP 3: Migrate existing inventory items
-- ============================================
-- Move all items with inventory_category_id to inventory_items table
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
  type = EXCLUDED.type;

-- STEP 4: Update remaining items in items table (menu items only)
-- ============================================
UPDATE public.items 
SET type = CASE 
  WHEN is_recipe = true THEN 'standalone'
  WHEN is_recipe = false THEN 'recipe'
  ELSE 'recipe'
END
WHERE type IS NULL 
  AND inventory_category_id IS NULL 
  AND category_id IS NOT NULL;

-- STEP 5: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_items_type ON public.items(type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory_category_id ON public.inventory_items(inventory_category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON public.inventory_items(type);

-- STEP 6: Enable RLS
-- ============================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS policy
-- ============================================
DROP POLICY IF EXISTS "Allow public access" ON public.inventory_items;
CREATE POLICY "Allow public access" ON public.inventory_items FOR ALL USING (true);

-- STEP 8: Add comments
-- ============================================
COMMENT ON TABLE public.inventory_items IS 'Inventory items only (for Inventory page - standalone products and ingredients)';
COMMENT ON COLUMN public.items.type IS 'Menu item type: standalone, recipe, or saleOnly';
COMMENT ON COLUMN public.inventory_items.type IS 'Inventory item type: standalone (finished product) or ingredient (raw material)';

-- STEP 9: Display migration summary
-- ============================================
DO $$
DECLARE
  inventory_count INTEGER;
  standalone_count INTEGER;
  ingredient_count INTEGER;
  menu_items_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inventory_count FROM public.inventory_items;
  SELECT COUNT(*) INTO standalone_count FROM public.inventory_items WHERE type = 'standalone';
  SELECT COUNT(*) INTO ingredient_count FROM public.inventory_items WHERE type = 'ingredient';
  SELECT COUNT(*) INTO menu_items_count FROM public.items WHERE category_id IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Inventory Items (inventory_items table):';
  RAISE NOTICE '  - Total: %', inventory_count;
  RAISE NOTICE '  - Standalone: %', standalone_count;
  RAISE NOTICE '  - Ingredient: %', ingredient_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Menu Items (items table): %', menu_items_count;
  RAISE NOTICE '========================================';
END $$;

-- STEP 10: Optional - Clean up items table
-- ============================================
-- Uncomment the following line to remove migrated inventory items from items table
-- WARNING: Only do this after verifying the migration was successful!

-- DELETE FROM public.items WHERE inventory_category_id IS NOT NULL;

-- STEP 11: Update schema version
-- ============================================
INSERT INTO public.schema_version (version, description) VALUES
  ('2.4', 'Added inventory_items table and type columns for better separation between Menu and Inventory. Migrated existing data.')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());

-- ============================================
-- Verification Queries
-- ============================================
-- Run these queries to verify the migration:

-- 1. Check inventory_items
-- SELECT type, COUNT(*) as count FROM public.inventory_items GROUP BY type;

-- 2. Check items with portions
-- SELECT ii.name, ii.type, COUNT(ip.id) as portions
-- FROM public.inventory_items ii
-- LEFT JOIN public.item_portions ip ON ip.item_id = ii.id
-- GROUP BY ii.id, ii.name, ii.type
-- ORDER BY portions DESC;

-- 3. Verify menu items
-- SELECT type, COUNT(*) as count FROM public.items WHERE category_id IS NOT NULL GROUP BY type;

-- ============================================
-- END OF MIGRATION
-- ============================================
