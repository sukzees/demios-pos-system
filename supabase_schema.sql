-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Categories Table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Items Table
create table public.items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric not null,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  stock integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Orders Table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  total_amount numeric not null default 0,
  status text not null check (status in ('pending', 'completed', 'cancelled')),
  payment_method text not null check (payment_method in ('cash', 'bank_transfer')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Order Items Table
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  quantity integer not null default 1,
  price_at_time numeric not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Expenses Table
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  description text not null,
  amount numeric not null,
  date timestamp with time zone not null default now(),
  category text not null,
  payment_method text,
  vendor text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Employees Table
create table public.employees (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  role text not null check (role in ('admin', 'manager', 'staff')),
  pin text,
  status text not null check (status in ('active', 'inactive')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Stations Table (for Kitchen Display System / Printers)
create table public.stations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  printer_ip text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Station Mappings Table (Link Categories to Stations)
create table public.station_mappings (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references public.categories(id) on delete cascade,
  station_id uuid references public.stations(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Inventory Transactions Table (Track stock history)
create table public.inventory_transactions (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid references public.items(id) on delete cascade,
  quantity_change integer not null,
  transaction_type text not null check (transaction_type in ('sale', 'restock', 'adjustment', 'waste')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. License Keys Table
create table public.license_keys (
  id uuid default uuid_generate_v4() primary key,
  license_key text unique not null,
  expires_at timestamp with time zone not null,
  renew_date timestamp with time zone,
  activation_data jsonb,
  machine_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) - Optional but recommended
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.employees enable row level security;
alter table public.stations enable row level security;
alter table public.station_mappings enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.license_keys enable row level security;

-- Create policies to allow public access (for development simplicity)
-- WARNING: In production, you should restrict these policies!
create policy "Allow public read access" on public.categories for select using (true);
create policy "Allow public insert access" on public.categories for insert with check (true);
create policy "Allow public update access" on public.categories for update using (true);
create policy "Allow public delete access" on public.categories for delete using (true);

create policy "Allow public read access" on public.items for select using (true);
create policy "Allow public insert access" on public.items for insert with check (true);
create policy "Allow public update access" on public.items for update using (true);
create policy "Allow public delete access" on public.items for delete using (true);

create policy "Allow public read access" on public.orders for select using (true);
create policy "Allow public insert access" on public.orders for insert with check (true);
create policy "Allow public update access" on public.orders for update using (true);

create policy "Allow public read access" on public.order_items for select using (true);
create policy "Allow public insert access" on public.order_items for insert with check (true);

create policy "Allow public read access" on public.expenses for select using (true);
create policy "Allow public insert access" on public.expenses for insert with check (true);

create policy "Allow public read access" on public.employees for select using (true);
create policy "Allow public insert access" on public.employees for insert with check (true);
create policy "Allow public update access" on public.employees for update using (true);

create policy "Allow public read access" on public.stations for select using (true);
create policy "Allow public insert access" on public.stations for insert with check (true);

create policy "Allow public read access" on public.station_mappings for select using (true);
create policy "Allow public insert access" on public.station_mappings for insert with check (true);

create policy "Allow public read access" on public.inventory_transactions for select using (true);
create policy "Allow public insert access" on public.inventory_transactions for insert with check (true);

create policy "Allow public read access" on public.license_keys for select using (true);
create policy "Allow public insert access" on public.license_keys for insert with check (true);
create policy "Allow public update access" on public.license_keys for update using (true);

-- Insert some initial data (Optional)
insert into public.categories (name) values ('Beverages'), ('Food'), ('Dessert');
