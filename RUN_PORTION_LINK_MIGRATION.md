# Quick Guide: Run Portion Link Migration

## What This Does

This migration links your existing portions to inventory items so that:
- Portion stock syncs with Inventory Current Stock
- Checkout deducts from both portion stock AND inventory stock
- Auto-sync timer keeps them synchronized every 1 minute

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar

### 2. Run the Migration
1. Click "New Query" button
2. Copy the entire content from: `migrations/link_portions_to_inventory.sql`
3. Paste into the SQL editor
4. Click "Run" button (or press F5)

### 3. Check the Results

You should see output similar to:

```
┌─────────────────────────────────┬───────┐
│ description                      │ count │
├─────────────────────────────────┼───────┤
│ Portions linked to inventory    │   15  │
│ Portions linked to items         │    5  │
│ Portions linked to recipes       │    3  │
└─────────────────────────────────┴───────┘

NOTICE:  ========================================
NOTICE:  PORTION LINKING SUMMARY
NOTICE:  ========================================
NOTICE:  Total portions: 23
NOTICE:  Linked portions: 23
NOTICE:  Unlinked portions: 0
NOTICE:  ========================================
```

### 4. Verify in Your App

1. **Open Browser Console** (F12)
2. **Go to Items & Categories page**
3. You should see: `[AUTO-SYNC] Synced portion stocks to inventory_items: X items`
4. **Go to Inventory page**
5. Check that Current Stock for items with portions shows the sum of all portions

### 5. Test the Full Flow

**Test 1: Edit Portions**
1. Go to Items & Categories
2. Click Edit on an item with portions
3. Change portion stock (e.g., Small: 5, Medium: 10, Large: 15)
4. Click Save
5. Console should show: `[SAVE-PORTIONS] Updated: Small`
6. Wait 1 minute
7. Console should show: `[AUTO-SYNC] Synced portion stocks to inventory_items: 1 items`
8. Go to Inventory page
9. Current Stock should be 30 (5+10+15)

**Test 2: Checkout**
1. Go to POS page
2. Add item with portion (e.g., Burger - Medium size, which has 10 stock)
3. Complete checkout
4. Console should show:
   ```
   [CHECKOUT-PORTION] Portion xxx: 10 -> 9
   [CHECKOUT-PORTION] Inventory xxx: 30 -> 29
   ```
5. Go to Inventory page
6. Current Stock should now be 29 (was 30)
7. Go to Items & Categories → Edit that item
8. Medium portion should show 9 stock (was 10)

## Troubleshooting

### Problem: "Portions linked to inventory: 0"

**Possible causes**:
1. Items don't have `inventory_item_id` set
2. Item type is not 'standalone'

**Check with this query**:
```sql
SELECT 
  i.id,
  i.name,
  i.type,
  i.inventory_item_id
FROM items i
WHERE i.type = 'standalone';
```

**If `inventory_item_id` is NULL**, you need to link items to inventory first:
```sql
-- Find matching inventory items by name
UPDATE items i
SET inventory_item_id = (
  SELECT ii.id 
  FROM inventory_items ii 
  WHERE ii.name = i.name 
  LIMIT 1
)
WHERE i.type = 'standalone'
  AND i.inventory_item_id IS NULL;
```

### Problem: Portion prices showing as 0

**Check database directly**:
```sql
SELECT 
  ip.id,
  ip.portion_name,
  ip.portion_price,
  ip.portion_cost_price
FROM item_portions ip
WHERE ip.portion_price = 0 OR ip.portion_price IS NULL;
```

**Fix manually**:
```sql
-- Update specific portion
UPDATE item_portions
SET portion_price = 150.00
WHERE id = '<portion_id>';
```

### Problem: Auto-sync not running

**Check console**:
- You should see `[AUTO-SYNC]` message every 60 seconds
- If not, refresh the Items & Categories page

**Manually trigger sync**:
```sql
-- Calculate totals and update inventory
WITH portion_totals AS (
  SELECT 
    inventory_item_id,
    SUM(portion_stock) as total_stock
  FROM item_portions
  WHERE inventory_item_id IS NOT NULL
  GROUP BY inventory_item_id
)
UPDATE inventory_items ii
SET stock = pt.total_stock
FROM portion_totals pt
WHERE ii.id = pt.inventory_item_id;
```

## Migration File Location

```
d:\Projects\POS\supabase-pos-system\migrations\link_portions_to_inventory.sql
```

## What Gets Changed

### Before Migration:
```
item_portions table:
├─ id: xxx
├─ portion_name: "Medium"
├─ portion_stock: 10
├─ item_id: yyy
├─ inventory_item_id: NULL  ← Problem!
└─ recipe_id: NULL
```

### After Migration:
```
item_portions table:
├─ id: xxx
├─ portion_name: "Medium"
├─ portion_stock: 10
├─ item_id: NULL  ← Cleared to avoid FK conflicts
├─ inventory_item_id: zzz  ← Linked!
└─ recipe_id: NULL
```

## Important Notes

1. **Backup first**: The migration modifies data. Make sure you have a recent backup.

2. **Only one FK**: The migration ensures only ONE of (item_id, recipe_id, inventory_item_id) is set per portion to avoid constraint violations.

3. **Auto-sync runs automatically**: Once the migration is complete, the auto-sync timer (added in `app/items/page.tsx`) will keep stocks synchronized.

4. **Check console logs**: Always watch the browser console (F12) for `[SAVE-PORTIONS]`, `[CHECKOUT-PORTION]`, and `[AUTO-SYNC]` messages.

## Success Criteria

✅ Migration runs without errors  
✅ Console shows "X portions linked to inventory"  
✅ Edit modal saves portions without errors  
✅ Portion prices show correctly in edit modal (not 0)  
✅ Checkout deducts from both portion and inventory stock  
✅ Auto-sync message appears every 1 minute  
✅ Inventory Current Stock = sum of all portions  

## Need Help?

If you encounter issues:

1. Check the console logs in browser (F12)
2. Run the debugging queries in this document
3. Review `PORTION_STOCK_SYNC_FIX.md` for detailed technical information
4. Check `CONTEXT_TRANSFER_SUMMARY.md` for overall architecture

## Related Files

- `migrations/link_portions_to_inventory.sql` - The migration to run
- `app/items/page.tsx` - Edit modal and auto-sync timer
- `lib/store.ts` - Checkout logic (already correct)
- `PORTION_STOCK_SYNC_FIX.md` - Detailed technical documentation
- `CONTEXT_TRANSFER_SUMMARY.md` - Overall project status
