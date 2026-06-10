# Database Schema Changelog

## Version 2.0 (2026-05-07)

### 🆕 New Tables Added

1. **inventory_categories** - หมวดหมู่สำหรับสต็อกสินค้า
2. **recipe_ingredients** - ส่วนผสมของเมนูที่เป็น Recipe
3. **item_portions** - ขนาดต่างๆ ของเมนู (เล็ก/กลาง/ใหญ่)
4. **zones** - โซนของร้าน (Indoor/Outdoor/VIP)
5. **tables** - โต๊ะในร้าน
6. **expense_categories** - หมวดหมู่ค่าใช้จ่าย
7. **schema_version** - ติดตามเวอร์ชันของ schema

### 📝 Modified Tables

#### items
- ✅ Added `cost_price` - ราคาทุน
- ✅ Added `min_stock` - สต็อกขั้นต่ำ
- ✅ Added `inventory_category_id` - เชื่อมกับหมวดหมู่สต็อก
- ✅ Added `is_recipe` - บอกว่าเป็น Recipe หรือไม่

#### orders
- ✅ Added `table_id` - เชื่อมกับโต๊ะ
- ✅ Added `zone_id` - เชื่อมกับโซน
- ✅ Added `order_type` - ประเภท (dine-in/takeout/delivery)
- ✅ Changed `payment_method` values: 'bank_transfer' → 'card', 'online'

#### employees
- ✅ Added `permissions` (JSONB) - สิทธิ์การเข้าถึงเมนูและการกระทำ

### 🔍 New Indexes

Performance indexes added for:
- items (category_id, inventory_category_id, is_recipe)
- recipe_ingredients (recipe_id, ingredient_id)
- item_portions (item_id)
- tables (zone_id, status)
- orders (table_id, order_type, status, created_at)
- order_items (order_id, item_id)
- inventory_transactions (item_id, created_at)
- employees (role, status)
- shifts (status, start_time)

### 📊 Initial Data

#### Default Categories
- Beverages
- Food
- Dessert

#### Default Inventory Categories
- Raw Materials
- Packaging
- Supplies

#### Default Expense Categories
- Rent
- Utilities
- Supplies
- Salaries
- Marketing
- Maintenance

#### Default Zones
- Indoor (สีน้ำเงิน #3B82F6)
- Outdoor (สีเขียว #10B981)
- VIP (สีส้ม #F59E0B)

#### Default Tables
- T1-T10 (10 โต๊ะ)
  - T1-T5: 4 ที่นั่ง
  - T6-T8: 6 ที่นั่ง
  - T9-T10: 2 ที่นั่ง

#### Default Employee
- Administrator (admin role)
- PIN: 123456
- Full permissions

### 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Public access policies for development
- ⚠️ **WARNING**: Restrict policies in production!

### 📝 Comments

Added comprehensive comments on:
- All tables
- Important columns
- Special fields (order_type, permissions, is_recipe, status)

---

## Version 1.0 (Original)

### Initial Tables
1. categories
2. items
3. orders
4. order_items
5. expenses
6. employees
7. stations
8. station_mappings
9. inventory_transactions
10. license_keys
11. shifts

---

## Migration Guide

### From Version 1.0 to 2.0

#### Option 1: Fresh Install (Recommended for new projects)
```sql
-- Drop all existing tables (WARNING: This deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Run the new schema
-- Execute: supabase_schema.sql
```

#### Option 2: Incremental Update (For existing data)
```sql
-- 1. Add new tables
-- Execute: tables-system-schema.sql
-- Execute: add-employee-permissions.sql

-- 2. Add new columns to existing tables
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_stock INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_category_id UUID REFERENCES inventory_categories(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_recipe BOOLEAN DEFAULT false;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES tables(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine-in' CHECK (order_type IN ('dine-in', 'takeout', 'delivery'));

-- 3. Create new tables
CREATE TABLE IF NOT EXISTS recipe_ingredients (...);
CREATE TABLE IF NOT EXISTS item_portions (...);
CREATE TABLE IF NOT EXISTS inventory_categories (...);
CREATE TABLE IF NOT EXISTS expense_categories (...);
CREATE TABLE IF NOT EXISTS zones (...);
CREATE TABLE IF NOT EXISTS tables (...);

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
-- ... (see schema for all indexes)

-- 5. Insert default data
INSERT INTO zones (name, description, color, display_order) VALUES (...);
-- ... (see schema for all default data)
```

### Verification

After migration, verify:
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check schema version
SELECT * FROM schema_version;

-- Check default data
SELECT COUNT(*) FROM zones; -- Should be 3
SELECT COUNT(*) FROM tables; -- Should be 10
SELECT COUNT(*) FROM employees WHERE role = 'admin'; -- Should be at least 1
```

---

## Breaking Changes

### ⚠️ Payment Method Values
- Old: 'bank_transfer'
- New: 'card', 'online'
- **Action Required**: Update existing orders if using 'bank_transfer'

```sql
-- Migration script for payment_method
UPDATE orders 
SET payment_method = 'card' 
WHERE payment_method = 'bank_transfer';
```

### ⚠️ Employee Permissions
- All existing employees will get default permissions
- Admin users will get full permissions automatically
- **Action Required**: Review and adjust permissions for each employee

---

## Features Enabled by Schema 2.0

### ✅ Completed Features
1. **Recipe Management** - เมนูที่ทำจากส่วนผสมหลายอย่าง
2. **Portion Sizes** - ขนาดต่างๆ ของเมนู
3. **Tables & Zones** - จัดการโต๊ะและโซน
4. **Employee Permissions** - ควบคุมสิทธิ์การเข้าถึง
5. **Inventory Categories** - แยกหมวดหมู่สต็อก
6. **Expense Categories** - แยกหมวดหมู่ค่าใช้จ่าย
7. **Order Types** - แยกประเภทออเดอร์ (Dine-in/Takeout/Delivery)

### 🚧 Pending Implementation
1. **POS Table Selection** - เลือกโต๊ะก่อนสั่งอาหาร
2. **Table Status Updates** - อัปเดตสถานะโต๊ะอัตโนมัติ
3. **Recipe Stock Deduction** - หักสต็อกส่วนผสมเมื่อขาย Recipe
4. **Permission Enforcement** - บังคับใช้สิทธิ์ในทุกหน้า

---

## Support

For issues or questions:
1. Check `TABLES_SYSTEM_GUIDE.md` for tables/zones documentation
2. Check `PERMISSIONS_SYSTEM.md` for permissions documentation
3. Review `supabase_schema.sql` for complete schema definition

---

## Rollback

To rollback to Version 1.0:
```sql
-- Backup your data first!
-- Then restore from backup or re-run old schema
```

**Note**: Rollback will lose all new features and data in new tables.
