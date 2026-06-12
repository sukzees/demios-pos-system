-- ============================================
-- Supabase POS System - Complete Schema
-- Version: 2.1
-- Last Updated: 2026-05-07
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- 1. Categories Table (Menu Categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Inventory Categories Table (Stock Categories)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Items Table (Menu Items & Inventory Items)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  min_stock INTEGER,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  inventory_category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_recipe BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recipe Ingredients Table (For Recipe Items)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipe_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  quantity_needed NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Item Portions Table (For Items with Multiple Sizes)
CREATE TABLE IF NOT EXISTS public.item_portions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- TABLES & ZONES SYSTEM
-- ============================================

-- 6. Zones Table (Restaurant Zones/Sections)
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tables Table (Restaurant Tables)
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_number TEXT NOT NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'inactive')),
  current_order_id UUID,
  is_merged BOOLEAN DEFAULT FALSE,  -- ทำเครื่องหมายว่าโต๊ะนี้ถูกรวมมาจากโต๊ะอื่น
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ORDERS & TRANSACTIONS
-- ============================================

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'online', 'transfer')),
  notes TEXT,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  order_type TEXT DEFAULT 'dine-in' CHECK (order_type IN ('dine-in', 'takeout', 'delivery')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_time NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- INVENTORY MANAGEMENT
-- ============================================

-- 10. Inventory Transactions Table (Track stock history)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'restock', 'adjustment', 'waste')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- EXPENSES
-- ============================================

-- 11. Expense Categories Table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  category TEXT NOT NULL,
  payment_method TEXT,
  vendor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- EMPLOYEES & PERMISSIONS
-- ============================================

-- 13. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  pin TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  permissions JSONB DEFAULT '{
    "menus": {
      "dashboard": true,
      "pos": true,
      "history": true,
      "items": false,
      "inventory": false,
      "tables": false,
      "employees": false,
      "expenses": false,
      "reports": false,
      "settings": false
    },
    "actions": {
      "view": true,
      "create": false,
      "edit": false,
      "delete": false,
      "export": false
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- SHIFTS
-- ============================================

-- 14. Shifts Table (Track shift open/close history)
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  end_time TIMESTAMP WITH TIME ZONE,
  cash_amount NUMERIC NOT NULL DEFAULT 0,
  transfer_amount NUMERIC NOT NULL DEFAULT 0,
  started_by TEXT,
  closed_by TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- KITCHEN DISPLAY SYSTEM
-- ============================================

-- 15. Stations Table (for Kitchen Display System / Printers)
CREATE TABLE IF NOT EXISTS public.stations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  printer_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Station Mappings Table (Link Categories to Stations)
CREATE TABLE IF NOT EXISTS public.station_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- LICENSE MANAGEMENT
-- ============================================

-- 17. License Keys Table
CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  renew_date TIMESTAMP WITH TIME ZONE,
  activation_data JSONB,
  machine_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_inventory_category_id ON public.items(inventory_category_id);
CREATE INDEX IF NOT EXISTS idx_items_is_recipe ON public.items(is_recipe);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON public.recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_item_portions_item_id ON public.item_portions(item_id);
CREATE INDEX IF NOT EXISTS idx_tables_zone_id ON public.tables(zone_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON public.order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON public.shifts(start_time);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Public Access for Development)
-- WARNING: In production, restrict these policies!
-- ============================================

-- Categories
CREATE POLICY "Allow public access" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.inventory_categories FOR ALL USING (true);

-- Items & Related
CREATE POLICY "Allow public access" ON public.items FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.recipe_ingredients FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.item_portions FOR ALL USING (true);

-- Tables & Zones
CREATE POLICY "Allow public access" ON public.zones FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.tables FOR ALL USING (true);

-- Orders
CREATE POLICY "Allow public access" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.order_items FOR ALL USING (true);

-- Inventory
CREATE POLICY "Allow public access" ON public.inventory_transactions FOR ALL USING (true);

-- Expenses
CREATE POLICY "Allow public access" ON public.expense_categories FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.expenses FOR ALL USING (true);

-- Employees
CREATE POLICY "Allow public access" ON public.employees FOR ALL USING (true);

-- Shifts
CREATE POLICY "Allow public access" ON public.shifts FOR ALL USING (true);

-- Stations
CREATE POLICY "Allow public access" ON public.stations FOR ALL USING (true);
CREATE POLICY "Allow public access" ON public.station_mappings FOR ALL USING (true);

-- License
CREATE POLICY "Allow public access" ON public.license_keys FOR ALL USING (true);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default categories
INSERT INTO public.categories (name) VALUES 
  ('Beverages'),
  ('Food'),
  ('Dessert')
ON CONFLICT DO NOTHING;

-- Insert default inventory categories
INSERT INTO public.inventory_categories (name) VALUES 
  ('Raw Materials'),
  ('Packaging'),
  ('Supplies')
ON CONFLICT DO NOTHING;

-- Insert default expense categories
INSERT INTO public.expense_categories (name) VALUES 
  ('Rent'),
  ('Utilities'),
  ('Supplies'),
  ('Salaries'),
  ('Marketing'),
  ('Maintenance')
ON CONFLICT DO NOTHING;

-- Insert default zones
INSERT INTO public.zones (name, description, color, display_order) VALUES
  ('Indoor', 'Indoor dining area', '#3B82F6', 1),
  ('Outdoor', 'Outdoor seating area', '#10B981', 2),
  ('VIP', 'VIP section', '#F59E0B', 3)
ON CONFLICT DO NOTHING;

-- Insert sample tables (T1-T10)
DO $$
DECLARE
  indoor_zone_id UUID;
BEGIN
  SELECT id INTO indoor_zone_id FROM public.zones WHERE name = 'Indoor' LIMIT 1;
  
  IF indoor_zone_id IS NOT NULL THEN
    INSERT INTO public.tables (table_number, zone_id, capacity, display_order) 
    SELECT 
      'T' || generate_series,
      indoor_zone_id,
      CASE 
        WHEN generate_series <= 5 THEN 4
        WHEN generate_series <= 8 THEN 6
        ELSE 2
      END,
      generate_series
    FROM generate_series(1, 10)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert default admin employee
INSERT INTO public.employees (name, role, status, pin, permissions) VALUES
  ('Administrator', 'admin', 'active', '123456', '{
    "menus": {
      "dashboard": true,
      "pos": true,
      "history": true,
      "items": true,
      "inventory": true,
      "tables": true,
      "employees": true,
      "expenses": true,
      "reports": true,
      "settings": true
    },
    "actions": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": true,
      "export": true
    }
  }'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.categories IS 'Menu categories for items';
COMMENT ON TABLE public.inventory_categories IS 'Inventory categories for stock management';
COMMENT ON TABLE public.items IS 'Menu items and inventory items';
COMMENT ON TABLE public.recipe_ingredients IS 'Ingredients needed for recipe items';
COMMENT ON TABLE public.item_portions IS 'Different portion sizes for items';
COMMENT ON TABLE public.zones IS 'Restaurant zones/sections for table organization';
COMMENT ON TABLE public.tables IS 'Restaurant tables with status tracking';
COMMENT ON TABLE public.orders IS 'Customer orders';
COMMENT ON TABLE public.order_items IS 'Items in each order';
COMMENT ON TABLE public.inventory_transactions IS 'Stock movement history';
COMMENT ON TABLE public.expense_categories IS 'Categories for expenses';
COMMENT ON TABLE public.expenses IS 'Business expenses';
COMMENT ON TABLE public.employees IS 'Staff members with permissions';
COMMENT ON TABLE public.shifts IS 'Work shift tracking';
COMMENT ON TABLE public.stations IS 'Kitchen stations/printers';
COMMENT ON TABLE public.station_mappings IS 'Category to station mappings';
COMMENT ON TABLE public.license_keys IS 'Software license management';

COMMENT ON COLUMN public.orders.order_type IS 'Type of order: dine-in, takeout, or delivery';
COMMENT ON COLUMN public.orders.table_id IS 'Reference to table if order is dine-in';
COMMENT ON COLUMN public.employees.permissions IS 'JSON object containing menu access and action permissions';
COMMENT ON COLUMN public.items.is_recipe IS 'True if item is made from other ingredients';
COMMENT ON COLUMN public.tables.status IS 'Table availability: available, occupied, reserved, inactive';

-- ============================================
-- SCHEMA VERSION
-- ============================================

CREATE TABLE IF NOT EXISTS public.schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  description TEXT
);

INSERT INTO public.schema_version (version, description) VALUES
  ('2.1', 'Added is_merged field to tables for split table functionality')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());

-- ============================================
-- END OF SCHEMA
-- ============================================
