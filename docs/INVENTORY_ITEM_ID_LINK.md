# Inventory Item ID Link

## Overview
Added `inventory_item_id` foreign key column to the `items` table to properly link menu items with their corresponding inventory items.

## Database Schema Changes

### New Column
```sql
ALTER TABLE public.items 
ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;
```

### Index
```sql
CREATE INDEX idx_items_inventory_item_id ON public.items(inventory_item_id);
```

## Benefits

### 1. **Clear Relationship**
- Items table now has explicit foreign key to inventory_items
- Better than using the same ID for both tables
- Allows one inventory item to be linked to multiple menu items if needed

### 2. **Data Integrity**
- Foreign key constraint ensures referenced inventory item exists
- ON DELETE SET NULL prevents orphaned records

### 3. **Query Performance**
- Index on `inventory_item_id` improves join performance
- Faster lookups when syncing stock between items and inventory

## Usage

### Creating Standalone Menu Items
When adding a standalone menu item (linked to inventory):

```typescript
const { data: newItem, error } = await supabase
  .from('items')
  .insert({
    name: itemName,
    price: price,
    category_id: menuCategoryId,
    inventory_item_id: inventoryItemId,  // Link to inventory_items
    type: 'standalone',
    show_in_menu: true,
    is_recipe: false
  });
```

### Querying Linked Items
Get menu items with their inventory details:

```sql
SELECT 
  i.id,
  i.name,
  i.price,
  i.category_id,
  ii.stock,
  ii.inventory_category_id,
  ii.cost_price
FROM items i
LEFT JOIN inventory_items ii ON i.inventory_item_id = ii.id
WHERE i.type = 'standalone';
```

### Syncing Stock
When an order is placed, stock deduction should happen on `inventory_items`:

```typescript
// Get the linked inventory item
const item = await supabase
  .from('items')
  .select('inventory_item_id')
  .eq('id', menuItemId)
  .single();

// Deduct stock from inventory_items
if (item.inventory_item_id) {
  await supabase
    .from('inventory_items')
    .update({ stock: supabase.raw('stock - ?', [quantity]) })
    .eq('id', item.inventory_item_id);
}
```

## Migration

Run the migration script:
```bash
psql -d your_database -f migrations/add_inventory_item_id_to_items.sql
```

Or through Supabase SQL Editor:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste contents of `migrations/add_inventory_item_id_to_items.sql`
4. Run the query

## Item Types

| Type | Description | inventory_item_id |
|------|-------------|-------------------|
| `standalone` | Menu item linked to inventory | **Required** - Links to inventory_items |
| `recipe` | Menu item with ingredients | NULL - Uses recipe_ingredients table |
| `saleOnly` | Menu item with no stock tracking | NULL - No inventory link |

## Verification

Check if the column exists:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' AND column_name = 'inventory_item_id';
```

Check existing links:
```sql
SELECT 
  COUNT(*) as total_items,
  COUNT(inventory_item_id) as linked_items,
  COUNT(*) - COUNT(inventory_item_id) as unlinked_items
FROM items;
```

## Backward Compatibility

This change is **additive only** and maintains backward compatibility:
- Existing items without `inventory_item_id` will have NULL value
- NULL is allowed (not all items need inventory link)
- Recipes and sale-only items don't use this field

## Version
- Schema Version: 2.5
- Migration File: `add_inventory_item_id_to_items.sql`
- Date: 2026-06-16
