# Table Workflow V5 - Separate Cart per Table/Takeout

## Overview
Each table and takeout order now maintains its own separate cart. When switching between tables or to takeout, the system automatically saves the current cart and loads the cart for the selected table/takeout.

## Implementation Status: ✅ COMPLETE

## Key Features

### 1. Separate Cart Storage
- **savedCarts**: `Record<string, CartLine[]>` - Stores carts by key
- **Key Format**:
  - Tables: `table-{tableId}` (e.g., `table-abc123`)
  - Takeout: `takeout`

### 2. Automatic Cart Switching

#### When Selecting a Table/Takeout (`setCurrentTable`)
1. **Save current cart** to `savedCarts` using current key
2. **Load new cart** from `savedCarts` using new key
3. If no saved cart exists for the new table/takeout, start with empty cart

```typescript
setCurrentTable: (table, orderType) => {
  const { cart, currentTable, currentOrderType, savedCarts } = get();
  
  // บันทึก cart ปัจจุบันก่อนเปลี่ยน
  if (currentTable || currentOrderType) {
    const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
    savedCarts[currentKey] = [...cart];
  }
  
  // โหลด cart ของโต๊ะ/orderType ใหม่
  const newKey = table ? `table-${table.id}` : `takeout`;
  const newCart = savedCarts[newKey] || [];
  
  set({ 
    currentTable: table, 
    currentOrderType: orderType,
    cart: newCart,
    savedCarts: { ...savedCarts }
  });
}
```

### 3. Cart Cleanup

#### On Checkout (`checkout`)
- After successful checkout, delete the savedCart entry for current table/takeout
- Prevents old cart data from persisting after order completion

```typescript
// ล้าง savedCart ของโต๊ะ/orderType ปัจจุบัน
const { savedCarts } = get();
if (currentTable || currentOrderType) {
  const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
  delete savedCarts[currentKey];
}
```

#### On Clear Cart (`clearCart`)
- When manually clearing cart, also delete the savedCart entry
- Releases table if dine-in

```typescript
// ล้าง savedCart ของโต๊ะ/orderType ปัจจุบัน
if (currentTable || currentOrderType) {
  const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
  delete savedCarts[currentKey];
}
```

#### On Clear Current Table (`clearCurrentTable`)
- Saves current cart before clearing table selection
- Allows returning to the same table later with cart intact

## User Experience

### Scenario 1: Multiple Tables
1. User selects **Table 1** → Empty cart
2. User adds items: Burger, Fries → Cart has 2 items
3. User selects **Table 2** → Empty cart (Table 1 cart saved)
4. User adds items: Pizza → Cart has 1 item
5. User selects **Table 1** → Cart shows Burger, Fries (loaded from saved)

### Scenario 2: Table + Takeout
1. User selects **Table 3** → Empty cart
2. User adds items: Pasta, Salad → Cart has 2 items
3. User selects **Takeout** → Empty cart (Table 3 cart saved)
4. User adds items: Coffee → Cart has 1 item
5. User selects **Table 3** → Cart shows Pasta, Salad (loaded from saved)

### Scenario 3: Checkout Clears Saved Cart
1. User selects **Table 5** → Empty cart
2. User adds items: Steak, Wine → Cart has 2 items
3. User completes checkout → Cart cleared, table released
4. User selects **Table 5** again → Empty cart (savedCart was deleted on checkout)

## Technical Details

### State Structure
```typescript
interface PosState {
  cart: CartLine[];                      // Current active cart
  savedCarts: Record<string, CartLine[]>; // Saved carts by table/takeout
  currentTable: any | null;              // Currently selected table
  currentOrderType: 'dine-in' | 'takeout' | 'delivery' | null;
}
```

### Cart Line Structure
```typescript
type CartLine = {
  item: Item;
  quantity: number;
  notes?: string;
  sourceItemId?: string;
  portionName?: string;
  portionId?: string;
  sentToKitchen?: boolean;
  sentToKitchenTime?: string;
  completedInKitchen?: boolean;
  cancelled?: boolean;
};
```

## Benefits

1. **No Data Loss**: Switching tables doesn't lose menu items
2. **Multi-Table Management**: Staff can manage multiple tables simultaneously
3. **Flexible Workflow**: Can switch between dine-in and takeout freely
4. **Clean State**: Checkout properly cleans up saved carts
5. **Persistent Storage**: Uses Zustand persist middleware for reliability

## Related Features

- **Send to Kitchen**: Items marked as sent remain in cart when switching tables
- **Merge Tables**: Combines carts from two tables
- **Split Table**: Moves selected items to new table
- **Hold Order**: Saves entire order for later (separate from savedCarts)

## Files Modified

- `lib/store.ts`: Added `savedCarts` state and logic in `setCurrentTable`, `clearCurrentTable`, `clearCart`, `checkout`
- `app/pos/page.tsx`: No changes needed (uses store functions)
- `components/table-selection.tsx`: No changes needed (calls `onSelectTable` which uses `setCurrentTable`)

## Testing Checklist

- [x] Switch between tables preserves cart
- [x] Switch to takeout preserves table cart
- [x] Switch back to table loads saved cart
- [x] Checkout deletes savedCart entry
- [x] Clear cart deletes savedCart entry
- [x] Empty table starts with empty cart
- [x] Sent to kitchen items persist when switching tables
- [x] No diagnostics errors

## Version History

- **V5** (2026-05-07): Separate cart per table/takeout with savedCarts
- **V4**: Merge/Split tables system
- **V3**: Separate Dine-In and Takeout tabs
- **V2**: Allow re-entering occupied tables
- **V1**: Initial table selection system

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
