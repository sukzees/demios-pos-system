-- Fix Payment Method Constraint to Support 'transfer'
-- Run this SQL in Supabase SQL Editor

-- Step 1: Drop the old constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Step 2: Add new constraint with 'transfer' included
ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'online', 'transfer'));

-- Step 3: Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_payment_method_check';

-- Step 4: Update existing NULL values to 'cash' (optional)
UPDATE orders
SET payment_method = 'cash'
WHERE payment_method IS NULL;

-- Step 5: Test by updating a row
UPDATE orders 
SET payment_method = 'transfer' 
WHERE id = '015a274f-24a7-4135-8743-56a3e76a9de3';
