-- Update Expenses Table to include payment_method and vendor
-- Run this in the Supabase SQL editor to apply the changes to your existing project.

alter table public.expenses 
add column if not exists payment_method text,
add column if not exists vendor text;
