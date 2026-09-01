# คู่มือการเปลี่ยน Item IDs เป็น UUID ใหม่

## ⚠️ คำเตือนสำคัญ

การ run migration นี้จะ:
- **เปลี่ยน ID ของ items ทั้งหมด** เป็น UUID ใหม่
- **อัปเดต Foreign Keys** ในตารางที่เกี่ยวข้องทั้งหมด
- **ไม่สามารถ Rollback ได้ง่าย** หลังจาก run แล้ว

**ตารางที่จะได้รับผลกระทบ:**
1. `items` - Primary key จะเปลี่ยนเป็น UUID ใหม่
2. `order_items` - Foreign key `item_id` จะอัปเดต
3. `recipe_ingredients` - Foreign key `ingredient_id` จะอัปเดต
4. `item_portions` - Foreign key `item_id` จะอัปเดต
5. `inventory_transactions` - Foreign key `item_id` จะอัปเดต

---

## ขั้นตอนการเตรียมพร้อม

### 1. Backup Database (สำคัญมาก!)

```sql
-- ใน Supabase Dashboard → Database → Backups
-- หรือ export ข้อมูลออกมา

-- Export items table
COPY (SELECT * FROM items) TO '/tmp/items_backup.csv' CSV HEADER;

-- Export related tables
COPY (SELECT * FROM order_items) TO '/tmp/order_items_backup.csv' CSV HEADER;
COPY (SELECT * FROM recipe_ingredients) TO '/tmp/recipe_ingredients_backup.csv' CSV HEADER;
COPY (SELECT * FROM item_portions) TO '/tmp/item_portions_backup.csv' CSV HEADER;
COPY (SELECT * FROM inventory_transactions) TO '/tmp/inventory_transactions_backup.csv' CSV HEADER;
```

### 2. ตรวจสอบข้อมูลปัจจุบัน

```sql
-- ดูจำนวน items
SELECT COUNT(*) as total_items FROM items;

-- ดูตัวอย่าง item IDs ปัจจุบัน
SELECT id, name FROM items LIMIT 5;

-- ตรวจสอบ foreign key dependencies
SELECT 
  COUNT(DISTINCT oi.item_id) as items_in_orders,
  COUNT(DISTINCT ri.ingredient_id) as items_in_recipes,
  COUNT(DISTINCT ip.item_id) as items_with_portions,
  COUNT(DISTINCT it.item_id) as items_in_transactions
FROM items i
LEFT JOIN order_items oi ON i.id = oi.item_id
LEFT JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
LEFT JOIN item_portions ip ON i.id = ip.item_id
LEFT JOIN inventory_transactions it ON i.id = it.item_id;
```

---

## วิธีการ Run Migration

### Option 1: Run ใน Supabase SQL Editor (แนะนำ)

1. **เปิด Supabase Dashboard** → SQL Editor
2. **สร้าง New Query**
3. **Copy เนื้อหา** จาก `migrations/regenerate_item_ids_with_uuid.sql`
4. **Paste** ลงใน SQL Editor
5. **อ่านและเข้าใจ** migration ทั้งหมดก่อน
6. **คลิก Run** (⌘+Enter หรือ Ctrl+Enter)
7. **รอจนเสร็จสิ้น** - อาจใช้เวลานานถ้ามีข้อมูลเยอะ

### Option 2: Run ผ่าน psql Command Line

```bash
# Connect to your database
psql "postgresql://[user]:[password]@[host]:[port]/[database]"

# Run the migration
\i migrations/regenerate_item_ids_with_uuid.sql

# Check for errors
\echo :ERROR
```

---

## สิ่งที่ Migration จะทำ

### ขั้นตอนทั้งหมด (17 ขั้นตอน):

1. ✅ Enable UUID extension
2. ✅ สร้าง temporary table เก็บ mapping ระหว่าง old ID และ new UUID
3. ✅ Insert old IDs ลง mapping table
4. ✅ Disable triggers ชั่วคราว (ป้องกัน constraint violations)
5. ✅ เพิ่ม column `new_id` ใน items table
6. ✅ Populate new_id ด้วย UUID ใหม่
7-10. ✅ เพิ่ม `new_item_id` columns และอัปเดต foreign keys ในตารางที่เกี่ยวข้อง
11. ✅ ลบ foreign key constraints เก่า
12. ✅ สลับ old id กับ new id ใน items table
13. ✅ สลับ columns ในตารางที่เกี่ยวข้อง
14. ✅ สร้าง foreign key constraints ใหม่
15. ✅ Enable triggers กลับ
16. ✅ Set default UUID generation
17. ✅ สร้าง indexes ใหม่

---

## ตรวจสอบผลลัพธ์

### ตรวจสอบว่า IDs เป็น UUID

```sql
-- ตรวจสอบ items table
SELECT 
  'items' as table_name, 
  COUNT(*) as total_records,
  COUNT(CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuids
FROM items;

-- ดูตัวอย่าง UUIDs ใหม่
SELECT id, name FROM items LIMIT 5;
```

### ตรวจสอบ Foreign Keys

```sql
-- ตรวจสอบว่า foreign keys ยังคงถูกต้อง
SELECT 
  COUNT(*) as orphaned_records
FROM order_items oi
LEFT JOIN items i ON oi.item_id = i.id
WHERE i.id IS NULL;

-- ควรได้ 0 (ไม่มี orphaned records)
```

### ตรวจสอบ Constraints

```sql
-- ดู constraints ทั้งหมดของ items table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.items'::regclass;
```

---

## Rollback (ถ้าจำเป็น)

⚠️ **Rollback ยากมาก** เพราะ UUIDs ถูก generate แล้ว ไม่สามารถกู้คืน IDs เดิมได้

**วิธีเดียวที่ปลอดภัย:**
1. Restore จาก backup ที่ทำไว้ก่อน run migration
2. หรือ import ข้อมูลจาก CSV backups

```sql
-- Restore from backup (example)
-- 1. Drop current tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS item_portions CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS items CASCADE;

-- 2. Recreate tables (ใช้ schema เดิม)
-- 3. Import from CSV backups
\copy items FROM '/tmp/items_backup.csv' CSV HEADER;
\copy order_items FROM '/tmp/order_items_backup.csv' CSV HEADER;
-- ... etc
```

---

## ปัญหาที่อาจเกิดขึ้นและวิธีแก้

### ปัญหา: Foreign key constraint violation

**สาเหตุ:** มี records ที่ reference ไปหา items ที่ไม่มีอยู่

**วิธีแก้:**
```sql
-- หา orphaned records
SELECT * FROM order_items oi
LEFT JOIN items i ON oi.item_id = i.id
WHERE i.id IS NULL;

-- ลบ orphaned records ก่อน run migration
DELETE FROM order_items
WHERE item_id NOT IN (SELECT id FROM items);
```

### ปัญหา: Migration ใช้เวลานาน

**สาเหตุ:** มีข้อมูลเยอะมาก

**วิธีแก้:**
- รอให้เสร็จ (อาจใช้เวลา 5-10 นาที ถ้ามีหลักหมื่น records)
- Run ในช่วงเวลาที่ไม่มี traffic
- เพิ่ม timeout สำหรับ SQL query

### ปัญหา: Triggers ทำให้เกิด error

**สาเหตุ:** Triggers บาง triggers อาจ conflict

**วิธีแก้:**
- Migration disable triggers ไว้แล้ว
- ถ้ายังเกิด error ให้ disable manually:
```sql
ALTER TABLE items DISABLE TRIGGER ALL;
-- run migration
ALTER TABLE items ENABLE TRIGGER ALL;
```

---

## หลังจาก Run Migration แล้ว

### 1. ทดสอบการทำงาน

```sql
-- ทดสอบ insert item ใหม่
INSERT INTO items (name, price, category_id, type)
VALUES ('Test Item After Migration', 10.00, 'your-category-id', 'standalone')
RETURNING id;

-- ควรได้ UUID ใหม่
```

### 2. ตรวจสอบ Application

- รีเฟรชหน้า POS และทดสอบ
- ตรวจสอบว่า items แสดงถูกต้อง
- ทดสอบเพิ่ม item ลงตะกร้า
- ทดสอบ checkout

### 3. ตรวจสอบ Console Logs

- ดูว่ามี errors เกี่ยวกับ item IDs หรือไม่
- ตรวจสอบว่า stock แสดงถูกต้อง

---

## สรุป

✅ **ก่อน Run:**
- Backup database
- ตรวจสอบข้อมูล
- Test ใน development environment ก่อน

✅ **หลัง Run:**
- Verify UUIDs
- Check foreign keys
- Test application
- Monitor for errors

⚠️ **อย่าลืม:**
- Migration นี้เปลี่ยน IDs ถาวร
- ไม่สามารถ rollback ได้ง่าย
- ต้อง backup ก่อนเสมอ!

---

*Last Updated: 2026-06-17*
