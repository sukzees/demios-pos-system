-- Migration: Link recipe ingredients directly to inventory_items
-- This removes the need to create hidden duplicate rows in items for raw ingredients.

ALTER TABLE public.recipe_ingredients
DROP CONSTRAINT IF EXISTS recipe_ingredients_ingredient_id_fkey;

UPDATE public.recipe_ingredients ri
SET ingredient_id = i.inventory_item_id
FROM public.items i
WHERE ri.ingredient_id = i.id
  AND i.inventory_item_id IS NOT NULL;

ALTER TABLE public.recipe_ingredients
ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
FOREIGN KEY (ingredient_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.recipe_ingredients.ingredient_id IS 'Inventory item ID used as a recipe ingredient';
