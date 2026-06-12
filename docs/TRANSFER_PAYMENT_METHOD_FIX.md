# Transfer Payment Method Fix

## Problem
When selecting "Transfer" payment method during checkout, the system was saving `'online'` instead of `'transfer'` in the database.

## Root Cause
1. **POS Page**: `handleCheckout` function was mapping `'transfer'` → `'online'`
2. **Store Types**: Type definitions only allowed `'cash' | 'card' | 'online'`
3. **Shift Tracking**: Shift amount calculations only checked for `'online'` and `'card'`

## Changes Made

### 1. Database Schema (`supabase_schema.sql`)
```sql
-- Updated CHECK constraint to include 'transfer'
payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'online', 'transfer'))
```

### 2. POS Page (`app/pos/page.tsx`)
```typescript
// BEFORE:
const method = activeTab === 'transfer' ? 'online' : 'cash';

// AFTER:
const method = activeTab === 'transfer' ? 'transfer' : 'cash';
```

### 3. Store Types (`lib/store.ts`)
```typescript
// BEFORE:
paymentMethod: 'cash' | 'card' | 'online'

// AFTER:
paymentMethod: 'cash' | 'card' | 'online' | 'transfer'
```

### 4. Shift Tracking (`lib/store.ts`)
```typescript
// BEFORE:
shiftTransferAmount: state.shiftTransferAmount + (paymentMethod === 'online' || paymentMethod === 'card' ? totalAmount : 0)

// AFTER:
shiftTransferAmount: state.shiftTransferAmount + (paymentMethod === 'transfer' || paymentMethod === 'card' || paymentMethod === 'online' ? totalAmount : 0)
```

## Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- 1. Drop old constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- 2. Add new constraint with 'transfer'
ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'online', 'transfer'));

-- 3. Update old 'online' values to 'transfer' (optional)
UPDATE orders
SET payment_method = 'transfer'
WHERE payment_method = 'online';

-- 4. Verify
SELECT payment_method, COUNT(*) 
FROM orders 
GROUP BY payment_method;
```

## Dashboard Integration

The Dashboard already filters by payment method correctly:

```typescript
// Cash Revenue: includes NULL and 'cash'
const cashRev = completedOrders
  .filter((order: any) => !order.payment_method || order.payment_method === 'cash')
  .reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);

// Transfer Revenue: includes only 'transfer'
const transferRev = completedOrders
  .filter((order: any) => order.payment_method === 'transfer')
  .reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);
```

## Testing

1. ✅ Checkout with Cash → saves as `'cash'`
2. ✅ Checkout with Transfer → saves as `'transfer'`
3. ✅ Dashboard shows correct Cash Revenue
4. ✅ Dashboard shows correct Transfer Revenue
5. ✅ Shift tracking includes transfer amounts

## Files Modified
- `supabase_schema.sql` - Updated CHECK constraint
- `app/pos/page.tsx` - Fixed payment method mapping
- `lib/store.ts` - Updated types and shift calculations
- `app/page.tsx` - Already correct (filters by payment_method)
