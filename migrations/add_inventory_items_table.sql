-- ============================================
-- Migration: Add inventory_items table and type columns
-- Version: 2.4
-- Date: 2026-06-15
-- ============================================

-- 1. Create inventory_items table
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

-- 2. Add type column to items table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'items' AND column_name = 'type') THEN
    ALTER TABLE public.items 
    ADD COLUMN type TEXT CHECK (type IN ('standalone', 'recipe', 'saleOnly')) DEFAULT 'recipe';
  END IF;
END $$;

-- 3. Migrate existing items data to inventory_items table
-- Move all inventory items (show_in_menu = false) to inventory_items
INSERT INTO public.inventory_items (
  id, name, price, cost_price, min_stock, inventory_category_id, 
  image_url, stock, unit, type, created_at
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
    WHEN is_recipe = true THEN 'standalone'::TEXT
    ELSE 'ingredient'::TEXT
  END as type,
  created_at
FROM public.items
WHERE show_in_menu = false OR inventory_category_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Update items table - set type for remaining menu items
UPDATE public.items 
SET type = CASE 
  WHEN is_recipe = true AND show_in_menu = true THEN 'standalone'
  WHEN is_recipe = false THEN 'recipe'
  ELSE 'recipe'
END
WHERE type IS NULL AND show_in_menu = true;

-- 5. Optional: Remove migrated inventory items from items table
-- Uncomment if you want to clean up items table
-- DELETE FROM public.items WHERE show_in_menu = false OR inventory_category_id IS NOT NULL;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_items_type ON public.items(type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory_category_id ON public.inventory_items(inventory_category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON public.inventory_items(type);

-- 5. Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy
DROP POLICY IF EXISTS "Allow public access" ON public.inventory_items;
CREATE POLICY "Allow public access" ON public.inventory_items FOR ALL USING (true);

-- 7. Add comments
COMMENT ON TABLE public.inventory_items IS 'Inventory items only (for Inventory page - standalone products and ingredients)';
COMMENT ON COLUMN public.items.type IS 'Menu item type: standalone, recipe, or saleOnly';
COMMENT ON COLUMN public.inventory_items.type IS 'Inventory item type: standalone (finished product) or ingredient (raw material)';

-- 8. Update schema version
INSERT INTO public.schema_version (version, description) VALUES
  ('2.4', 'Added inventory_items table and type columns for better separation between Menu and Inventory')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- DROP TABLE IF EXISTS public.inventory_items CASCADE;
-- ALTER TABLE public.items DROP COLUMN IF EXISTS type;
-- DROP INDEX IF EXISTS idx_items_type;
-- DROP INDEX IF EXISTS idx_inventory_items_inventory_category_id;
-- DROP INDEX IF EXISTS idx_inventory_items_type;
-- DELETE FROM public.schema_version WHERE version = '2.4';
