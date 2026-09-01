# Update Old Orders Payment Method

## Problem
Orders created before the `payment_method` field was added have NULL values, causing Transfer Revenue to show 0.

## Solution Applied
Dashboard now treats NULL or missing `payment_method` as 'cash' by default.

```typescript
// Cash Revenue includes: NULL, undefined, or 'cash'
const cashRev = completedOrders
  .filter((order: any) => !order.payment_method || order.payment_method === 'cash')
  .reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);

// Transfer Revenue includes: only 'transfer'
const transferRev = completedOrders
  .filter((order: any) => order.payment_method === 'transfer')
  .reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);
```

## Optional: Update Old Orders in Database

If you want to update existing orders to have a default payment_method of 'cash', run this SQL in Supabase SQL Editor:

```sql
-- Update all orders with NULL payment_method to 'cash'
UPDATE orders
SET payment_method = 'cash'
WHERE payment_method IS NULL;
```

## Verification

After making a new order with "Transfer" payment method:
1. Go to Dashboard
2. Check that Transfer Revenue shows the correct amount
3. Check that Cash Revenue shows other orders

## Files Modified
- `app/page.tsx` - Updated payment method filtering logic
