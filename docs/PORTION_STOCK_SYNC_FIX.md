# Portion Stock Sync Fix - Summary

## Date: June 17, 2026

## Problems Identified

1. **Portion prices showing as 0** in edit modal
2. **Edit button moving items between tables** (items ↔ recipes) instead of updating in place
3. **Portions not syncing with inventory** - different stock shown in different pages:
   - Items & Categories page shows portion stock (e.g., medium: 7)
   - Inventory page shows different stock (e.g., 10)
   - `inventory_item_id` is NULL in item_portions table

## Changes Made

### 1. Fixed Edit Button Logic (`app/items/page.tsx`)
**Problem**: When editing an item with portions, the system was moving items between `items` and `recipes` tables based on type.

**Solution**: Modified `handleEditItem` function to:
- Keep items in their current table (items or recipes)
- Only update the data within the same table
- Don't delete and recreate items when editing
- This ensures items stay where they are and just get updated

**Code Changed**: Lines ~1000-1090 in `app/items/page.tsx`

### 2. Added Auto-Sync Timer (`app/items/page.tsx`)
**Problem**: Portion stock changes weren't reflected in inventory Current Stock.

**Solution**: Added a `useEffect` hook that:
- Runs every 1 minute (60,000ms)
- Calculates total portion stock for each inventory item
- Updates `inventory_items.stock` with the sum of all portions
- Logs sync activity to console: `[AUTO-SYNC] Synced portion stocks to inventory_items`

**Code Added**: After line ~365 in `app/items/page.tsx`

**How it works**:
```
Every 1 minute:
1. Query all item_portions WHERE inventory_item_id IS NOT NULL
2. Calculate SUM(portion_stock) GROUP BY inventory_item_id
3. UPDATE inventory_items SET stock = total WHERE id = inventory_item_id
```

### 3. Created Migration to Link Portions (`migrations/link_portions_to_inventory.sql`)
**Problem**: `item_portions.inventory_item_id` was NULL, so portions weren't linked to inventory.

**Solution**: Created migration that:
- Links portions to inventory via: `UPDATE item_portions SET inventory_item_id = items.inventory_item_id`
- Clears conflicting FKs (only one of item_id/recipe_id/inventory_item_id should be set)
- Shows verification queries and summary

**File**: `migrations/link_portions_to_inventory.sql`

## User Requirements (From Context)

1. ✅ **Inventory page: Show Current Stock = sum of all portions**
   - Fixed by auto-sync timer + migration linking

2. ✅ **Checkout: Deduct from both portion_stock AND inventory Current Stock**
   - Already implemented in `lib/store.ts` (lines ~2030-2080)

3. ✅ **After 1 minute: Auto-sync Current Stock from portions**
   - Fixed by auto-sync timer in useEffect

4. ✅ **Items page edit: UPDATE portions, don't delete+recreate**
   - Fixed by `syncPortionsForEdit` function (already uses UPDATE/INSERT, not DELETE+INSERT)

5. ✅ **Don't move items between tables when editing**
   - Fixed by simplified `handleEditItem` function

## Steps to Complete Fix

### Step 1: Run Migration
Run the migration in Supabase SQL Editor:

```sql
-- File: migrations/link_portions_to_inventory.sql
-- This links existing portions to their inventory items
```

**Expected Result**:
- Portions will have `inventory_item_id` set
- Console will show: "X portions linked to inventory"

### Step 2: Verify Checkout Deduction
1. Go to POS page
2. Add an item with portions (e.g., Burger - Medium)
3. Complete checkout
4. Check console logs for:
   - `[CHECKOUT-PORTION] Portion {id}: {old} -> {new}`
   - `[CHECKOUT-PORTION] Inventory {id}: {old} -> {new}`
5. Verify both portion stock AND inventory stock were deducted

### Step 3: Verify Auto-Sync
1. Edit an item with portions in Items & Categories page
2. Change portion stock (e.g., Small: 5, Medium: 10, Large: 15)
3. Save the item
4. Wait 1 minute
5. Check console for: `[AUTO-SYNC] Synced portion stocks to inventory_items: X items`
6. Go to Inventory page
7. Verify Current Stock = 5 + 10 + 15 = 30

### Step 4: Verify Edit Modal Updates
1. Go to Items & Categories page
2. Click Edit on an item with portions
3. Change portion prices (e.g., Medium: 150 THB)
4. Save
5. Check console for: `[SAVE-PORTIONS] Updated: Medium`
6. Edit again - verify price shows 150 THB (not 0)

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTION STOCK FLOW                        │
└─────────────────────────────────────────────────────────────┘

Items & Categories Page (Edit Modal)
  ↓
  Save portions with prices & stock
  ↓
item_portions table
  - portion_name, portion_price, portion_stock
  - inventory_item_id (linked to inventory_items)
  ↓
POS Checkout
  - Deduct from item_portions.portion_stock
  - Deduct from inventory_items.stock (via inventory_item_id)
  ↓
Auto-Sync Timer (Every 1 minute)
  - SUM(portion_stock) GROUP BY inventory_item_id
  - UPDATE inventory_items.stock
  ↓
Inventory Page
  - Display inventory_items.stock (Current Stock)
  - Shows sum of all portions
```

## Database Schema

```sql
-- Items table (menu items)
items
  - id (uuid)
  - name
  - price
  - category_id
  - type (standalone/saleonly)
  - inventory_item_id → references inventory_items.id
  - show_in_menu
  - NO STOCK COLUMN (removed)

-- Inventory items table (physical stock)
inventory_items
  - id (uuid)
  - name
  - stock (integer) ← synced from portions
  - inventory_category_id
  - unit
  - cost_per_unit

-- Portions table (sizes/variants)
item_portions
  - id (uuid)
  - portion_name
  - portion_price
  - portion_cost_price
  - portion_stock
  - inventory_item_id → references inventory_items.id (NEW)
  - item_id → references items.id (for non-standalone)
  - recipe_id → references recipes.id (for recipes)
```

## Debugging Tips

### Check if portions are linked:
```sql
SELECT 
  ip.id,
  ip.portion_name,
  ip.portion_stock,
  ip.inventory_item_id,
  ii.name as inventory_name,
  ii.stock as inventory_stock
FROM item_portions ip
LEFT JOIN inventory_items ii ON ip.inventory_item_id = ii.id
WHERE ip.inventory_item_id IS NOT NULL;
```

### Check portion totals vs inventory stock:
```sql
SELECT 
  ii.id,
  ii.name,
  ii.stock as inventory_stock,
  SUM(ip.portion_stock) as total_portion_stock,
  ii.stock - SUM(ip.portion_stock) as difference
FROM inventory_items ii
LEFT JOIN item_portions ip ON ip.inventory_item_id = ii.id
GROUP BY ii.id, ii.name, ii.stock
HAVING SUM(ip.portion_stock) IS NOT NULL;
```

### Check console logs:
- `[SAVE-PORTIONS]` - When editing portions in Items page
- `[CHECKOUT-PORTION]` - When checking out with portions
- `[AUTO-SYNC]` - Every 1 minute sync operation

## Known Issues / Future Work

1. **Initial sync needed**: After running migration, wait 1 minute for auto-sync or manually trigger sync
2. **Portion prices**: If still showing 0, check database directly - might be NULL values that need fixing
3. **Manual sync option**: Could add a "Sync Now" button instead of waiting 1 minute

## Files Modified

1. `app/items/page.tsx`
   - Fixed `handleEditItem` to keep items in same table
   - Added auto-sync timer in useEffect
   
2. `migrations/link_portions_to_inventory.sql`
   - NEW: Links portions to inventory items

3. `lib/store.ts`
   - Already has checkout logic to deduct from both portion and inventory (no changes needed)

## Testing Checklist

- [ ] Run migration `link_portions_to_inventory.sql`
- [ ] Verify portions have `inventory_item_id` set
- [ ] Edit item with portions - verify saves without errors
- [ ] Edit item again - verify portion prices show correctly (not 0)
- [ ] Checkout with portioned item - verify both stocks deducted
- [ ] Wait 1 minute - verify auto-sync log appears
- [ ] Check Inventory page - verify Current Stock = sum of portions
- [ ] Edit portion stock in Items page - verify syncs to Inventory after 1 minute
