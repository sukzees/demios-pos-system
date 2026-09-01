-- Create recipe_portions table for recipes with multiple sizes
CREATE TABLE IF NOT EXISTS public.recipe_portions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key constraint (optional, depends on your recipes table structure)
-- ALTER TABLE public.recipe_portions 
-- ADD CONSTRAINT recipe_portions_recipe_id_fkey 
-- FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS recipe_portions_recipe_id_idx ON public.recipe_portions(recipe_id);

-- Add comments
COMMENT ON TABLE public.recipe_portions IS 'Portions/sizes for recipes';
COMMENT ON COLUMN public.recipe_portions.stock IS 'Current stock level for this recipe portion';
