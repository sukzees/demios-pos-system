# 📘 วิธี Run Migration ผ่าน Supabase Dashboard

## ขั้นตอนการ Restore Items จาก Backup พร้อม UUID ใหม่

### 🎯 เป้าหมาย
Migrate ข้อมูล items จาก `items_backup` table กลับมาที่ `items` table โดยสร้าง UUID ใหม่ทั้งหมด

---

## 📋 Step-by-Step Guide

### **Step 1: เข้าสู่ Supabase Dashboard**

1. เปิดเว็บเบราว์เซอร์ไปที่ https://supabase.com
2. คลิก **Sign in**
3. เลือก Project ของคุณ

---

### **Step 2: เปิด SQL Editor**

1. ที่แถบเมนูด้านซ้าย คลิก **SQL Editor** 
   - หรือคลิกไอคอน `</>` 
2. คลิก **+ New query** เพื่อสร้าง query ใหม่

---

### **Step 3: ตรวจสอบข้อมูลก่อน Migrate**

ก่อนอื่น ให้ตรวจสอบว่ามี `items_backup` table และมีข้อมูลอยู่:

```sql
-- ดูจำนวน items ใน backup
SELECT COUNT(*) as total_items FROM items_backup;

-- ดูตัวอย่างข้อมูล
SELECT * FROM items_backup LIMIT 5;
```

**คลิก RUN** (หรือกด Ctrl+Enter / Cmd+Enter)

✅ **ถ้าเห็นผลลัพธ์** = พร้อม migrate  
❌ **ถ้าได้ error "relation does not exist"** = ต้องสร้าง backup ก่อน:

```sql
-- สร้าง backup จาก items table ปัจจุบัน
CREATE TABLE items_backup AS SELECT * FROM items;
```

---

### **Step 4: Copy Migration Script**

1. เปิดไฟล์ `migrations/restore_items_from_backup_with_new_ids.sql`
2. **Copy เนื้อหาทั้งหมด** (Ctrl+A แล้ว Ctrl+C)

หรือ copy จากนี่:

```sql
-- Migration: Restore Items from Backup with New UUIDs
-- Description: Migrate data from items_backup back to items table with newly generated UUIDs
-- Date: 2026-06-17

-- Step 1: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Ensure items table has UUID auto-generation
ALTER TABLE items 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 3: Create a temporary mapping table to track old ID -> new ID
CREATE TEMP TABLE IF NOT EXISTS item_id_mapping (
  old_id UUID,
  new_id UUID,
  item_name TEXT,
  PRIMARY KEY (old_id)
);

-- Step 4: Clear existing items (if any)
-- WARNING: This will delete all current items
TRUNCATE TABLE items CASCADE;

-- Step 5: Insert items from backup with new UUIDs
-- The DEFAULT keyword will trigger uuid_generate_v4()
WITH inserted_items AS (
  INSERT INTO items (
    -- id column omitted - will be auto-generated
    name,
    price,
    category_id,
    is_recipe,
    type,
    inventory_item_id,
    image_url,
    created_at,
    show_in_menu
  )
  SELECT 
    name,
    price,
    category_id,
    is_recipe,
    type,
    inventory_item_id,
    image_url,
    COALESCE(created_at, NOW()),  -- Use backup timestamp or now
    COALESCE(show_in_menu, true)  -- Default to true if not set
  FROM items_backup
  ORDER BY created_at ASC NULLS FIRST  -- Preserve creation order
  RETURNING id, name
)
-- Store the mapping between old IDs and new IDs
INSERT INTO item_id_mapping (old_id, new_id, item_name)
SELECT 
  b.id as old_id,
  i.id as new_id,
  i.name as item_name
FROM items_backup b
JOIN inserted_items i ON b.name = i.name
ORDER BY b.created_at ASC NULLS FIRST;

-- Step 6: Display the ID mapping for reference
SELECT 
  old_id,
  new_id,
  item_name,
  '✓ Migrated' as status
FROM item_id_mapping
ORDER BY item_name;

-- Step 7: Summary report
DO $$
DECLARE
  backup_count INTEGER;
  items_count INTEGER;
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM items_backup;
  SELECT COUNT(*) INTO items_count FROM items;
  SELECT COUNT(*) INTO mapping_count FROM item_id_mapping;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Items in backup table: %', backup_count;
  RAISE NOTICE 'Items migrated: %', items_count;
  RAISE NOTICE 'ID mappings created: %', mapping_count;
  RAISE NOTICE '';
  
  IF items_count = backup_count AND mapping_count = backup_count THEN
    RAISE NOTICE '✓ SUCCESS: All items migrated successfully!';
  ELSE
    RAISE WARNING '⚠ WARNING: Item counts do not match. Please verify.';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Step 8: Update foreign key references (OPTIONAL - only if needed)
-- Uncomment the sections below if you need to update references in other tables

/*
-- Update order_items references
UPDATE order_items oi
SET item_id = m.new_id
FROM item_id_mapping m
WHERE oi.item_id = m.old_id;

-- Update recipe_ingredients references
UPDATE recipe_ingredients ri
SET ingredient_id = m.new_id
FROM item_id_mapping m
WHERE ri.ingredient_id = m.old_id;

-- Update item_portions references
UPDATE item_portions ip
SET item_id = m.new_id
FROM item_id_mapping m
WHERE ip.item_id = m.old_id;

RAISE NOTICE 'Foreign key references updated.';
*/

-- Step 9: Verification queries
-- Check if all items were migrated
SELECT 
  'Items in backup' as description,
  COUNT(*) as count
FROM items_backup

UNION ALL

SELECT 
  'Items migrated' as description,
  COUNT(*) as count
FROM items

UNION ALL

SELECT 
  'ID mappings created' as description,
  COUNT(*) as count
FROM item_id_mapping;

-- Note: The item_id_mapping temporary table will be available for the duration of this session
-- If you need to update other tables, do it now before disconnecting
-- Or export the mapping to a permanent table:

/*
-- Optional: Save mapping permanently
CREATE TABLE IF NOT EXISTS item_id_migration_log (
  old_id UUID,
  new_id UUID,
  item_name TEXT,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (old_id)
);

INSERT INTO item_id_migration_log (old_id, new_id, item_name)
SELECT old_id, new_id, item_name
FROM item_id_mapping;
*/
```

---

### **Step 5: Paste และ Run Migration**

1. **Paste** script ที่ copy มาลงใน SQL Editor (Ctrl+V)
2. ตั้งชื่อ query (optional): `Restore Items with New IDs`
3. **อ่านและเข้าใจคำเตือน:**
   - ⚠️ Migration นี้จะลบ items ทั้งหมดใน items table
   - ⚠️ ข้อมูลที่เกี่ยวข้อง (order_items, recipe_ingredients) อาจถูกลบด้วย
4. **คลิก RUN** (หรือกด Ctrl+Enter / Cmd+Enter)

---

### **Step 6: ดูผลลัพธ์**

หลังจาก run เสร็จ คุณจะเห็น:

#### 📊 ตาราง ID Mapping
```
old_id                                | new_id                                | item_name        | status
--------------------------------------|---------------------------------------|------------------|------------
550e8400-e29b-41d4-a716-446655440000 | 123e4567-e89b-12d3-a456-426614174000 | ข้าวเหนียว       | ✓ Migrated
6ba7b810-9dad-11d1-80b4-00c04fd430c8 | 987fcdeb-51a2-43d7-b890-123456789abc | บาดชิ้น          | ✓ Migrated
...
```

#### 📝 Summary Report (ใน Notices/Messages)
```
========================================
MIGRATION SUMMARY
========================================
Items in backup table: 25
Items migrated: 25
ID mappings created: 25

✓ SUCCESS: All items migrated successfully!
========================================
```

#### 📈 Verification Table
```
description            | count
-----------------------|-------
Items in backup        | 25
Items migrated         | 25
ID mappings created    | 25
```

---

### **Step 7: ตรวจสอบข้อมูล**

Run query เหล่านี้เพื่อตรวจสอบ:

```sql
-- ดู items ที่ migrate แล้ว
SELECT id, name, price, type FROM items ORDER BY name LIMIT 10;

-- ตรวจสอบ UUID ใหม่ถูกสร้าง
SELECT 
  id,
  name,
  length(id::text) as id_length  -- ควรเป็น 36
FROM items
LIMIT 5;

-- ดูจำนวน items แยกตาม type
SELECT 
  type,
  COUNT(*) as count
FROM items
GROUP BY type;
```

---

### **Step 8: Update Foreign Keys (ถ้าจำเป็น)**

ถ้าคุณมีข้อมูลใน tables อื่นที่อ้างอิงถึง item_id และต้องการ update:

1. **Uncomment** section Step 8 ในไฟล์ migration
2. Run อีกครั้ง หรือ run แยก:

```sql
-- Update order_items
UPDATE order_items oi
SET item_id = m.new_id
FROM item_id_mapping m
WHERE oi.item_id = m.old_id;

-- Update recipe_ingredients
UPDATE recipe_ingredients ri
SET ingredient_id = m.new_id
FROM item_id_mapping m
WHERE ri.ingredient_id = m.old_id;

-- Update item_portions
UPDATE item_portions ip
SET item_id = m.new_id
FROM item_id_mapping m
WHERE ip.item_id = m.old_id;
```

---

### **Step 9: บันทึก ID Mapping (Optional)**

ถ้าต้องการเก็บ mapping ไว้ใช้ในอนาคต:

```sql
-- สร้าง permanent log table
CREATE TABLE IF NOT EXISTS item_id_migration_log (
  old_id UUID,
  new_id UUID,
  item_name TEXT,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (old_id)
);

-- บันทึก mapping
INSERT INTO item_id_migration_log (old_id, new_id, item_name)
SELECT old_id, new_id, item_name
FROM item_id_mapping;

-- ดู log
SELECT * FROM item_id_migration_log;
```

---

### **Step 10: ทดสอบ Application**

1. **รีสตาร์ท Next.js Application:**
   ```bash
   # หยุด dev server (Ctrl+C)
   npm run dev
   ```

2. **ทดสอบหน้าจอต่างๆ:**
   - ✅ POS Page - ดูว่า items แสดงถูกต้อง
   - ✅ Items & Categories Page - ทดสอบ CRUD
   - ✅ Inventory Page - ตรวจสอบ stock
   - ✅ Checkout - ทดสอบการขาย

---

## 🔄 Rollback (ถ้าต้องการย้อนกลับ)

ถ้าพบปัญหาและต้องการกู้คืน:

```sql
-- ลบ items ที่ migrate ไปแล้ว
TRUNCATE TABLE items CASCADE;

-- กู้คืนจาก backup (ใช้ ID เดิม)
INSERT INTO items 
SELECT * FROM items_backup;

-- ตรวจสอบ
SELECT COUNT(*) FROM items;
```

---

## ❓ Troubleshooting

### ปัญหา: "relation items_backup does not exist"

**แก้ไข:** สร้าง backup ก่อน
```sql
CREATE TABLE items_backup AS SELECT * FROM items;
```

---

### ปัญหา: "extension uuid-ossp does not exist"

**แก้ไข:** เปิดใช้งาน extension
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### ปัญหา: "foreign key violation"

**แก้ไข:** ใช้ CASCADE หรือลบข้อมูลที่เกี่ยวข้องก่อน
```sql
-- Option 1: ใช้ CASCADE (ข้อมูลที่อ้างอิงจะถูกลบด้วย)
TRUNCATE TABLE items CASCADE;

-- Option 2: ลบข้อมูลที่เกี่ยวข้องก่อน
DELETE FROM order_items;
DELETE FROM recipe_ingredients;
TRUNCATE TABLE items;
```

---

### ปัญหา: "duplicate key value" เมื่อ JOIN by name

**สาเหตุ:** มี items ชื่อซ้ำกันใน backup

**แก้ไข:** ใช้ window function แทน simple JOIN
```sql
-- แก้ไขใน Step 5 ของ migration
WITH inserted_items AS (
  ...
),
ranked_backup AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM items_backup
),
ranked_inserted AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as rn
  FROM inserted_items
)
INSERT INTO item_id_mapping (old_id, new_id, item_name)
SELECT 
  rb.id as old_id,
  ri.id as new_id,
  ri.name as item_name
FROM ranked_backup rb
JOIN ranked_inserted ri ON rb.name = ri.name AND rb.rn = ri.rn;
```

---

## 📌 Checklist

หลังจาก run migration เสร็จแล้ว:

- [ ] ตรวจสอบจำนวน items ตรงกับ backup
- [ ] ตรวจสอบ UUID ใหม่ถูกสร้าง
- [ ] บันทึก ID mapping (ถ้าต้องการ)
- [ ] Update foreign key references (ถ้าจำเป็น)
- [ ] รีสตาร์ท application
- [ ] ทดสอบ POS page
- [ ] ทดสอบ Items page
- [ ] ทดสอบ Checkout
- [ ] ทดสอบ Stock tracking

---

## 🔗 ไฟล์ที่เกี่ยวข้อง

- **Migration Script:** `migrations/restore_items_from_backup_with_new_ids.sql`
- **Full Guide:** `docs/RESTORE_ITEMS_FROM_BACKUP_GUIDE.md`
- **Quick Reference:** `docs/MIGRATION_QUICK_REFERENCE.md`

---

**สร้างเมื่อ:** 2026-06-17  
**อัพเดทล่าสุด:** 2026-06-17  
**เวอร์ชั่น:** 1.0
