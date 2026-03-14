-- Separate Expense categories for Expenses module
-- Run in Supabase SQL editor

create table if not exists public.expense_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into public.expense_categories (name)
values
  ('Inventory'),
  ('Utilities'),
  ('Maintenance'),
  ('Marketing'),
  ('Salary'),
  ('Other')
on conflict (name) do nothing;

alter table public.expense_categories enable row level security;

drop policy if exists "Allow public read access" on public.expense_categories;
create policy "Allow public read access" on public.expense_categories for select using (true);

drop policy if exists "Allow public insert access" on public.expense_categories;
create policy "Allow public insert access" on public.expense_categories for insert with check (true);

drop policy if exists "Allow public update access" on public.expense_categories;
create policy "Allow public update access" on public.expense_categories for update using (true);

drop policy if exists "Allow public delete access" on public.expense_categories;
create policy "Allow public delete access" on public.expense_categories for delete using (true);

