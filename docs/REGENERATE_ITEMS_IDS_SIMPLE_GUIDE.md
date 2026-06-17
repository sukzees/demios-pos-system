# คู่มือการเปลี่ยน IDs ใน Items Table เท่านั้น

## ภาพรวม

Migration นี้จะ:
- ✅ เปลี่ยน ID ของ items ทั้งหมดเป็น UUID ใหม่
- ✅ ตั้งค่า auto-generate UUID สำหรับ items ใหม่
- ✅ สร้าง backup table (`items_backup`) ก่อนลบข้อมูล
- ⚠️ **ลบข้อมูลทั้งหมดใน items table** (แต่สามารถ restore ได้จาก backup)

**ไม่ได้อัปเดต:**
- ❌ Foreign keys ในตารางอื่นๆ (order_items, recipe_ingredients, item_portions, etc.)
- ❌ ข้อมูลที่เกี่ยวข้องในตารางอื่น

---

## เมื่อไหร่ควรใช้ Migration นี้

✅ **ใช้เมื่อ:**
- คุณต้องการเริ่มต้นใหม่กับ items
- ไม่มีข้อมูลสำคัญใน items table
- ต้องการให้ items มี UUID แบบใหม่

❌ **ไม่ควรใช้เมื่อ:**
- มีข้อมูล orders ที่อ้างอิงถึง items
- มี recipes ที่ใช้ items เป็น ingredients
- มี portions ที่ link กับ items
- ต้องการเก็บ foreign key relationships

**ถ้าต้องการเก็บ relationships ให้ใช้:** `regenerate_item_ids_with_uuid.sql` แทน

---

## ขั้นตอนการใช้งาน

### 1. เช็คข้อมูลปัจจุบัน

```sql
-- ดูจำนวน items
SELECT COUNT(*) as total_items FROM items;

-- ดู items ทั้งหมด
SELECT * FROM items;

-- เช็คว่ามีตารางอื่นที่อ้างอิงถึง items หรือไม่
SELECT 
  COUNT(*) as items_in_orders
FROM order_items;

SELECT 
  COUNT(*) as items_as_ingredients
FROM recipe_ingredients;
```

### 2. Run Migration

**ใน Supabase SQL Editor:**

1. เปิด SQL Editor
2. Copy เนื้อหาจาก `migrations/regenerate_items_ids_only.sql`
3. Paste และ Run

**SQL:**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Backup current items
CREATE TABLE IF NOT EXISTS items_backup AS SELECT * FROM items;

-- Clear items table
TRUNCATE TABLE items RESTART IDENTITY CASCADE;

-- Set auto-generate UUID
ALTER TABLE items ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Add comment
COMMENT ON COLUMN items.id IS 'Auto-generated UUID primary key';
```

### 3. ตรวจสอบผลลัพธ์

```sql
-- ตรวจสอบว่า backup ถูกสร้าง
SELECT COUNT(*) as backup_count FROM items_backup;

-- ตรวจสอบว่า items table ว่างเปล่า
SELECT COUNT(*) as current_count FROM items;
-- ควรได้ 0

-- ทดสอบ insert item ใหม่
INSERT INTO items (name, price, category_id, type)
VALUES ('Test Item', 10.00, 'your-category-id', 'standalone')
RETURNING id;
-- ควรได้ UUID ใหม่กลับมา
```

---

## Restore จาก Backup (ถ้าต้องการ)

```sql
-- Restore ข้อมูลทั้งหมดจาก backup
INSERT INTO items SELECT * FROM items_backup;

-- หรือ restore เฉพาะบางรายการ
INSERT INTO items 
SELECT * FROM items_backup 
WHERE name LIKE '%specific%';
```

---

## ลบ Backup Table (หลังจากมั่นใจแล้ว)

```sql
-- ลบ backup table
DROP TABLE IF EXISTS items_backup;
```

---

## วิธีแก้ปัญหา Foreign Key Constraints

ถ้า migration ไม่สำเร็จเพราะมี foreign key constraints:

### Option 1: Drop Constraints ก่อน

```sql
-- Drop foreign keys จากตารางอื่น
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_item_id_fkey;
ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_ingredient_id_fkey;
ALTER TABLE item_portions DROP CONSTRAINT IF EXISTS item_portions_item_id_fkey;
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_item_id_fkey;

-- จากนั้น run migration

-- สร้าง constraints ใหม่ (หลังจากเพิ่ม items กลับ)
ALTER TABLE order_items 
ADD CONSTRAINT order_items_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
-- ทำแบบเดียวกันกับตารางอื่น
```

### Option 2: ลบข้อมูลที่เกี่ยวข้องก่อน

```sql
-- ลบข้อมูลทั้งหมดที่อ้างอิงถึง items
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE recipe_ingredients CASCADE;
TRUNCATE TABLE item_portions CASCADE;
TRUNCATE TABLE inventory_transactions CASCADE;

-- จากนั้น run migration
```

---

## หลังจาก Run Migration

### 1. เพิ่ม Items ใหม่

```sql
-- เพิ่ม item ใหม่ (ID จะถูก generate อัตโนมัติ)
INSERT INTO items (name, price, category_id, type, stock)
VALUES 
  ('ເຂົ້າຫນຽວ', 15000, 'cat-id-1', 'standalone', 100),
  ('ປາດິບ', 25000, 'cat-id-2', 'standalone', 50)
RETURNING id, name;
```

### 2. หรือ Restore จาก Backup แล้ว Update IDs

```sql
-- Option A: Restore ทั้งหมด (จะใช้ IDs เดิม)
INSERT INTO items SELECT * FROM items_backup;

-- Option B: Restore แต่ generate IDs ใหม่
INSERT INTO items (name, price, category_id, type, stock, created_at)
SELECT name, price, category_id, type, stock, created_at
FROM items_backup;
-- IDs ใหม่จะถูก generate อัตโนมัติ
```

### 3. ทดสอบใน Application

- รีเฟรชหน้า POS
- ตรวจสอบว่า items แสดงถูกต้อง
- ทดสอบเพิ่ม item ใหม่ในหน้า Items & Categories

---

## สรุป

✅ **Migration นี้เหมาะสำหรับ:**
- เริ่มต้นใหม่กับ items table
- ไม่สนใจ foreign key relationships
- ต้องการ UUID generation

⚠️ **ข้อควรระวัง:**
- จะลบข้อมูล items ทั้งหมด
- จะสูญเสีย relationships กับตารางอื่น
- ต้อง backup ก่อนเสมอ

📝 **ทางเลือกอื่น:**
- ถ้าต้องการเก็บ relationships: ใช้ `regenerate_item_ids_with_uuid.sql`
- ถ้าแค่ต้องการ auto UUID สำหรับ items ใหม่: ใช้ `add_auto_uuid_to_items.sql`

---

*Last Updated: 2026-06-17*
