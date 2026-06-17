-- Migration: Add inventory_item_id to inventory_transactions
-- This allows tracking transactions for inventory_items (which now hold the stock)

-- Step 1: Add inventory_item_id column
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_item_id 
ON public.inventory_transactions(inventory_item_id);

-- Note: item_id still references items(id) for backward compatibility
-- New transactions should use inventory_item_id for inventory items
