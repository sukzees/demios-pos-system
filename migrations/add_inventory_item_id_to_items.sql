-- ============================================
-- Migration: Add inventory_item_id to items table
-- Description: Add foreign key to link items table with inventory_items table
-- Version: 2.5
-- Date: 2026-06-16
-- ============================================

-- Add inventory_item_id column to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_inventory_item_id 
ON public.items(inventory_item_id);

-- Add comment
COMMENT ON COLUMN public.items.inventory_item_id IS 'Foreign key linking to inventory_items table for standalone menu items';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'items' AND column_name = 'inventory_item_id';
