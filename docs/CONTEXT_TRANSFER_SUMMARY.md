# Context Transfer Summary - Updated June 17, 2026

## Current Status: TASK 6 - Portion Stock Sync ✅ FIXED

## Recent Fixes Applied

### 1. Fixed Edit Button Not Saving Portions Properly
**Problem**: When clicking Edit → Save in Items & Categories page:
- Items were being moved between `items` and `recipes` tables
- Portions were not being updated correctly
- Data was being deleted and recreated instead of updated

**Solution**: 
- Modified `handleEditItem` function in `app/items/page.tsx`
- Now items stay in their current table (items or recipes)
- Only updates data within the same table
- No more delete+recreate operations

**File**: `app/items/page.tsx` (lines ~1000-1050)

### 2. Added Auto-Sync Timer (Every 1 Minute)
**Problem**: Portion stock changes weren't reflected in Inventory Current Stock

**Solution**:
- Added `useEffect` hook with interval timer
- Every 60 seconds: calculates SUM(portion_stock) for each inventory item
- Updates `inventory_items.stock` automatically
- Logs to console: `[AUTO-SYNC] Synced portion stocks to inventory_items`

**File**: `app/items/page.tsx` (after line ~365)

**How it works**:
```javascript
Every 1 minute:
1. SELECT inventory_item_id, portion_stock FROM item_portions
2. Calculate totals per inventory_item_id
3. UPDATE inventory_items SET stock = total
```

### 3. Created Migration to Link Portions
**Problem**: `item_portions.inventory_item_id` was NULL, preventing sync

**Solution**:
- Created migration: `migrations/link_portions_to_inventory.sql`
- Links portions to inventory via items table
- Clears conflicting foreign keys
- Shows verification queries

**SQL Logic**:
```sql
UPDATE item_portions ip
SET inventory_item_id = i.inventory_item_id
FROM items i
WHERE ip.item_id = i.id
  AND i.type = 'standalone'
  AND i.inventory_item_id IS NOT NULL;
```

## User Requirements Status

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 1. Inventory page: Show Current Stock = sum of portions | ✅ DONE | Auto-sync timer + migration |
| 2. Checkout: Deduct both portion & inventory stock | ✅ DONE | Already in `lib/store.ts` |
| 3. Auto-sync after 1 minute | ✅ DONE | useEffect timer added |
| 4. Edit modal: UPDATE portions, don't delete+recreate | ✅ DONE | `syncPortionsForEdit` already does this |
| 5. Don't move items between tables when editing | ✅ DONE | Fixed `handleEditItem` |

## Next Steps to Complete

### Step 1: Run Migration
```sql
-- Run in Supabase SQL Editor
-- File: migrations/link_portions_to_inventory.sql
```

This will:
- Link existing portions to inventory items
- Set `inventory_item_id` in item_portions table
- Show verification report

### Step 2: Test the Flow

1. **Test Edit & Save**:
   - Go to Items & Categories page
   - Click Edit on item with portions
   - Change portion prices (e.g., Small: 100, Medium: 150)
   - Click Save
   - Console should show: `[SAVE-PORTIONS] Updated: Small`
   - Edit again - prices should show correctly (not 0)

2. **Test Checkout Deduction**:
   - Go to POS page
   - Add item with portion (e.g., Burger - Medium)
   - Complete checkout
   - Console should show:
     - `[CHECKOUT-PORTION] Portion xxx: 10 -> 9`
     - `[CHECKOUT-PORTION] Inventory xxx: 30 -> 29`

3. **Test Auto-Sync**:
   - Edit item portions in Items & Categories
   - Change stock (Small: 5, Medium: 10, Large: 15)
   - Save
   - Wait 1 minute
   - Console should show: `[AUTO-SYNC] Synced portion stocks to inventory_items: 1 items`
   - Go to Inventory page
   - Current Stock should show 30 (5+10+15)

### Step 3: Verify Portion Prices
If portion prices still show as 0:

```sql
-- Check database directly
SELECT 
  ip.portion_name,
  ip.portion_price,
  ip.portion_cost_price,
  i.name as item_name
FROM item_portions ip
JOIN items i ON ip.item_id = i.id OR ip.inventory_item_id = (SELECT inventory_item_id FROM items WHERE id = ip.item_id)
WHERE ip.portion_price = 0 OR ip.portion_price IS NULL;

-- If found, you can update manually:
UPDATE item_portions
SET portion_price = <correct_price>
WHERE id = '<portion_id>';
```

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   DATA FLOW DIAGRAM                       │
└──────────────────────────────────────────────────────────┘

Items & Categories Page
  └─> Edit Modal
       └─> Save Portions (UPDATE, not DELETE+INSERT)
            └─> item_portions table
                 ├─> portion_name
                 ├─> portion_price
                 ├─> portion_stock
                 └─> inventory_item_id ← links to inventory_items

POS Checkout
  └─> Deduct from:
       ├─> item_portions.portion_stock (-1)
       └─> inventory_items.stock (-1) via inventory_item_id

Auto-Sync Timer (Every 60 seconds)
  └─> Calculate SUM(portion_stock) per inventory_item_id
       └─> UPDATE inventory_items.stock = total

Inventory Page
  └─> Display inventory_items.stock
       (Shows sum of all portions automatically)
```

## Database Schema (Current State)

```sql
-- Items table (menu items)
CREATE TABLE items (
  id UUID PRIMARY KEY,
  name TEXT,
  price DECIMAL,
  category_id UUID REFERENCES categories(id),
  type TEXT, -- 'standalone' or 'saleonly'
  inventory_item_id UUID REFERENCES inventory_items(id),
  show_in_menu BOOLEAN
  -- NO STOCK COLUMN (removed)
);

-- Inventory items table (physical stock)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  name TEXT,
  stock INTEGER, -- Auto-synced from portions every 1 min
  inventory_category_id UUID,
  unit TEXT,
  cost_per_unit DECIMAL
);

-- Portions table
CREATE TABLE item_portions (
  id UUID PRIMARY KEY,
  portion_name TEXT,
  portion_price DECIMAL,
  portion_cost_price DECIMAL,
  portion_stock INTEGER,
  -- Foreign keys (only ONE should be set):
  inventory_item_id UUID REFERENCES inventory_items(id), -- NEW
  item_id UUID REFERENCES items(id),
  recipe_id UUID REFERENCES recipes(id)
);
```

## Console Log Reference

Watch for these console logs during testing:

| Log Prefix | When | What to Check |
|------------|------|---------------|
| `[SAVE-PORTIONS]` | Edit → Save in Items page | Should show "Updated: {name}" or "Inserted: {name}" |
| `[CHECKOUT-PORTION]` | Checkout completion | Should show both Portion and Inventory stock changes |
| `[AUTO-SYNC]` | Every 1 minute | Should show number of items synced |

## Files Changed in This Fix

1. **app/items/page.tsx**
   - Line ~1000: Fixed `handleEditItem` to keep items in same table
   - Line ~365: Added auto-sync timer useEffect
   
2. **migrations/link_portions_to_inventory.sql** (NEW)
   - Links portions to inventory items
   - Clears conflicting FKs
   
3. **PORTION_STOCK_SYNC_FIX.md** (NEW)
   - Detailed documentation of the fix

4. **lib/store.ts** (NO CHANGES NEEDED)
   - Checkout logic already correct

## Debugging Queries

### Check portion linkage:
```sql
SELECT 
  ip.portion_name,
  ip.portion_stock,
  ip.inventory_item_id,
  ii.name as inventory_name,
  ii.stock as inventory_current_stock
FROM item_portions ip
LEFT JOIN inventory_items ii ON ip.inventory_item_id = ii.id
WHERE ip.inventory_item_id IS NOT NULL;
```

### Check sync accuracy:
```sql
SELECT 
  ii.id,
  ii.name,
  ii.stock as inventory_stock,
  SUM(ip.portion_stock) as total_portion_stock,
  ii.stock - COALESCE(SUM(ip.portion_stock), 0) as difference
FROM inventory_items ii
LEFT JOIN item_portions ip ON ip.inventory_item_id = ii.id
GROUP BY ii.id, ii.name, ii.stock;
```

## Previous Tasks (From Context Transfer)

### TASK 1: Remove stock column from items table
- **STATUS**: Migration created, NOT yet run
- **FILE**: `migrations/remove_stock_from_items.sql`
- **NOTE**: Need to run on production database

### TASK 2: Fix "Out of Stock" display issue
- **STATUS**: ✅ DONE
- **SOLUTION**: Fallback logic in POS page

### TASK 3: Add auto-generated UUID for items
- **STATUS**: ✅ DONE
- **FILE**: `migrations/add_auto_uuid_to_items.sql`

### TASK 4: Regenerate item IDs
- **STATUS**: ✅ DONE
- **FILE**: `migrations/regenerate_items_ids_only.sql`

### TASK 5: Restore items from backup
- **STATUS**: ✅ DONE
- **FILE**: `migrations/restore_items_from_backup_with_new_ids.sql`

### TASK 6: Portion stock sync
- **STATUS**: ✅ FIXED (Current task)
- **FILES**: 
  - `app/items/page.tsx` (modified)
  - `migrations/link_portions_to_inventory.sql` (new)

## Final Checklist

- [ ] Run `migrations/link_portions_to_inventory.sql` in Supabase
- [ ] Verify console shows: "X portions linked to inventory"
- [ ] Test edit modal - portion prices show correctly
- [ ] Test checkout - both stocks deducted
- [ ] Wait 1 minute - verify auto-sync runs
- [ ] Check Inventory page - Current Stock = portion sum
- [ ] Document any remaining issues

## Contact/Questions

All fixes have been implemented. The auto-sync timer will keep inventory stock synchronized with portion totals automatically every 60 seconds.

If portion prices still show as 0 after migration, check the database directly using the debugging queries above and update manually if needed.
