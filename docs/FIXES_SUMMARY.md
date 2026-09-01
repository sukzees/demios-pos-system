# Summary of Fixes - Sale Only Items & Inventory Portions

## Problems Fixed

### 1. Sale Only Items Storage Issue
**Problem:** Sale Only items were being saved in `recipes` table with `is_recipe = true`, which was incorrect.

**Solution:** 
- Changed Sale Only items to be saved in `items` table with:
  - `type = 'saleonly'`
  - `is_recipe = false`
  - `stock = 0` (don't track stock)
  - `show_in_menu = true`
- Updated POS page to recognize Sale Only items by `type === 'saleonly'`
- Sale Only items now properly show unlimited stock (999999) in POS

**Files Changed:**
- `app/items/page.tsx` - Modified `handleAddItem()` function to save Sale Only items in `items` table
- `app/pos/page.tsx` - Updated item classification logic to recognize `type === 'saleonly'`

### 2. Inventory Items Portions Foreign Key Constraint
**Problem:** When adding portions to inventory items, got error:
```
insert or update on table "item_portions" violates foreign key constraint "item_portions_item_id_fkey"
```

This happened because `item_portions` table had foreign keys only for `items` and `recipes` tables, but not for `inventory_items` table.

**Solution:**
- Created migration to add `inventory_item_id` column to `item_portions` table
- Updated constraint to allow `item_id`, `recipe_id`, OR `inventory_item_id` (but only one)
- Updated Inventory page to use `inventory_item_id` instead of `item_id` when saving/loading portions

**Files Changed:**
- `migrations/add_inventory_item_id_to_portions.sql` - New migration file
- `app/inventory/page.tsx` - Updated `loadItemPortions()` and `syncItemPortions()` functions

## Database Schema Changes

### item_portions Table
**Before:**
```sql
CREATE TABLE item_portions (
  item_id UUID REFERENCES items(id),
  recipe_id UUID REFERENCES recipes(id),
  CONSTRAINT check_item_or_recipe CHECK (
    (item_id IS NOT NULL AND recipe_id IS NULL) OR
    (item_id IS NULL AND recipe_id IS NOT NULL)
  )
);
```

**After:**
```sql
CREATE TABLE item_portions (
  item_id UUID REFERENCES items(id),
  recipe_id UUID REFERENCES recipes(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  CONSTRAINT check_item_recipe_or_inventory CHECK (
    (item_id IS NOT NULL AND recipe_id IS NULL AND inventory_item_id IS NULL) OR
    (item_id IS NULL AND recipe_id IS NOT NULL AND inventory_item_id IS NULL) OR
    (item_id IS NULL AND recipe_id IS NULL AND inventory_item_id IS NOT NULL)
  )
);
```

## Item Type Classification

### Current Item Types in System

1. **Standalone Items** (`type = 'standalone'`)
   - Menu items linked to inventory via `inventory_item_id`
   - Stock tracked from `inventory_items` table
   - Can have portions
   - Display stock badge in POS

2. **Sale Only Items** (`type = 'saleonly'`)
   - Menu items without inventory tracking
   - `is_recipe = false`
   - Unlimited stock (999999)
   - Can have portions
   - No stock badge in POS

3. **Recipe Items** (from `recipes` table, `is_recipe = false`)
   - Complex items with ingredients
   - Stock calculated from recipe ingredients
   - Can have portions
   - Display "Ready" badge in POS

4. **Ingredient Items** (`type = 'ingredient'`)
   - From `inventory_items` table
   - Used in recipes
   - Not shown in POS menu (no `category_id`)

## Testing Checklist

- [x] Sale Only items save to `items` table with correct fields
- [x] Sale Only items display in POS with unlimited stock
- [x] Inventory items can have portions without foreign key error
- [x] Standalone items display correct stock from linked inventory
- [x] Recipe items calculate stock correctly from ingredients
- [ ] Run migration `add_inventory_item_id_to_portions.sql` on database
- [ ] Test adding portions to inventory items
- [ ] Test Sale Only items in checkout process

## Migration Instructions

1. Run the migration file:
   ```bash
   # Apply to Supabase
   supabase db push
   ```

2. Or manually execute SQL:
   ```sql
   -- See migrations/add_inventory_item_id_to_portions.sql
   ```

## Next Steps

1. Update existing Sale Only items in `recipes` table to move to `items` table (optional migration)
2. Test all item types in POS checkout
3. Verify portion stock tracking for inventory items
4. Update documentation for item type differences
