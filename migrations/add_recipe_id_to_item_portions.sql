-- Add recipe_id column to item_portions table to support both items and recipes
ALTER TABLE public.item_portions 
ADD COLUMN IF NOT EXISTS recipe_id UUID;

-- Add index for recipe_id
CREATE INDEX IF NOT EXISTS item_portions_recipe_id_idx ON public.item_portions(recipe_id);

-- Add comment
COMMENT ON COLUMN public.item_portions.recipe_id IS 'Recipe ID if this portion belongs to a recipe (mutually exclusive with item_id)';

-- Add check constraint to ensure either item_id or recipe_id is set (but not both)
ALTER TABLE public.item_portions 
ADD CONSTRAINT item_portions_product_check 
CHECK (
  (item_id IS NOT NULL AND recipe_id IS NULL) OR 
  (item_id IS NULL AND recipe_id IS NOT NULL)
);
