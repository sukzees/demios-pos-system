# Stock Deduction Fix - Prevent Double Deduction

## Problem
Stock was being deducted twice when confirming payment:
1. Once during the checkout process
2. Potentially again through duplicate checkout calls or pending actions sync

## Root Causes Identified

### 1. Duplicate Table Release
The table was being released in two places:
- In `handleCheckout` function in `app/pos/page.tsx`
- In `checkout` function in `lib/store.ts`

This could cause race conditions.

### 2. No Protection Against Duplicate Checkout Calls
If the user double-clicked the "Confirm Payment" button, or if there was a race condition, the checkout function could be called multiple times simultaneously.

### 3. Potential Pending Actions Issue
If checkout actions were queued in `pendingActions` (offline mode), they could be processed again when the app came back online via `syncPendingActions()`.

## Solutions Implemented

### 1. Added `isCheckingOut` Flag
- Added a new state flag `isCheckingOut` to prevent duplicate checkout calls
- The flag is set to `true` at the start of checkout
- If checkout is called while `isCheckingOut` is `true`, it returns immediately
- The flag is reset to `false` after checkout completes (success or failure)

**Files Modified:**
- `lib/store.ts`: Added `isCheckingOut` to PosState interface and initial state
- `lib/store.ts`: Added checkout guard logic

### 2. Removed Duplicate Table Release
- Removed the table release code from `handleCheckout` in `app/pos/page.tsx`
- Table release is now only handled in the `checkout` function in `lib/store.ts`

**Files Modified:**
- `app/pos/page.tsx`: Removed duplicate table release code

### 3. Enhanced Logging
Added detailed console logging to track:
- When checkout starts and with what parameters
- Active cart items count
- Stock deduction operations (old stock → new stock)
- When syncPendingActions processes checkout actions

This will help debug any remaining issues.

**Files Modified:**
- `lib/store.ts`: Added logging throughout checkout and syncPendingActions

## How It Works Now

### Online Mode Checkout Flow:
1. User clicks "Confirm Payment"
2. `handleCheckout` calls `checkout()`
3. `checkout` checks if `isCheckingOut` is true (guard against duplicates)
4. Sets `isCheckingOut = true`
5. Filters out cancelled items to get `activeCart`
6. Clears cart from UI
7. Creates order in database
8. Deducts stock from database (using `activeCart` only)
9. Releases table if dine-in
10. Fetches updated items from database
11. Sets `isCheckingOut = false`
12. Returns success

### Offline Mode Checkout Flow:
1. User clicks "Confirm Payment"
2. `checkout` checks if `isCheckingOut` is true
3. Sets `isCheckingOut = true`
4. Adds CHECKOUT action to `pendingActions`
5. Sets `isCheckingOut = false`
6. When app comes back online, `syncPendingActions` processes the queued checkout
7. Stock is deducted once during sync

## Testing Recommendations

1. **Test Normal Checkout:**
   - Add items to cart
   - Click "Confirm Payment" once
   - Verify stock is deducted only once
   - Check console logs for "[CHECKOUT]" messages

2. **Test Double-Click Protection:**
   - Add items to cart
   - Double-click "Confirm Payment" rapidly
   - Verify only one checkout is processed
   - Check console logs for "Already processing checkout" message

3. **Test Offline Mode:**
   - Go offline
   - Complete a checkout
   - Go back online
   - Verify stock is deducted only once
   - Check console logs for "[SYNC]" messages

4. **Test Cancelled Items:**
   - Add items to cart
   - Cancel some items
   - Complete checkout
   - Verify only non-cancelled items affect stock

## Console Log Messages to Watch

- `[CHECKOUT] Starting checkout...` - Checkout initiated
- `[CHECKOUT] Already processing checkout, ignoring duplicate call` - Duplicate prevented
- `[CHECKOUT] Active cart items: X` - Number of items being processed
- `[CHECKOUT] Deducting X from item Y` - Stock deduction happening
- `[CHECKOUT] Item X: A -> B` - Stock change (A = old, B = new)
- `[SYNC] syncPendingActions called` - Pending actions being processed
- `[SYNC] Processing CHECKOUT action from pendingActions` - Offline checkout being synced

## Files Modified

1. `lib/store.ts`
   - Added `isCheckingOut` flag to state
   - Added duplicate checkout protection
   - Enhanced logging
   - Removed duplicate table release

2. `app/pos/page.tsx`
   - Removed duplicate table release code
   - Simplified handleCheckout function

## Next Steps

If stock is still being deducted twice:
1. Check console logs to see which path is being taken
2. Verify `isOnline` status is correct
3. Check if there are any pending actions in localStorage
4. Clear browser cache and localStorage to start fresh
5. Test with a fresh browser session
