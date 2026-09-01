# คู่มือ: Restore Items จาก Backup พร้อม UUID ใหม่

## ภาพรวม

Migration นี้จะ restore ข้อมูล items จาก `items_backup` table กลับมาที่ `items` table โดย:
- สร้าง UUID ใหม่ทั้งหมดสำหรับทุก item
- เก็บ mapping ระหว่าง old ID และ new ID
- รักษาข้อมูลอื่นๆ ไว้ทั้งหมด (name, price, category_id, etc.)

## ⚠️ คำเตือนสำคัญ

1. **Migration นี้จะลบข้อมูลใน items table ทั้งหมด** (TRUNCATE CASCADE)
2. **ข้อมูลที่อ้างอิงกับ items จะถูกลบด้วย** เช่น:
   - order_items
   - recipe_ingredients (ถ้าอ้างอิง item_id)
   - item_portions
3. **Backup database ก่อนทุกครั้ง!**

## ขั้นตอนการใช้งาน

### 1. ตรวจสอบข้อมูลใน items_backup

```sql
-- ดูจำนวน items ใน backup
SELECT COUNT(*) FROM items_backup;

-- ดูข้อมูล sample
SELECT * FROM items_backup LIMIT 5;

-- ตรวจสอบว่ามี items_backup table หรือไม่
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'items_backup';
```

### 2. Backup Database (สำคัญมาก!)

```bash
# ใช้ Supabase Dashboard
# Settings → Database → Backups → Create Backup

# หรือใช้ pg_dump
pg_dump -h your-host -U your-user -d your-db > backup_before_restore.sql
```

### 3. Run Migration

#### วิธีที่ 1: ใช้ Supabase Dashboard

1. เปิด Supabase Dashboard
2. ไปที่ **SQL Editor**
3. คัดลอกเนื้อหาจาก `migrations/restore_items_from_backup_with_new_ids.sql`
4. Paste และกด **Run**

#### วิธีที่ 2: ใช้ psql Command Line

```bash
psql -h your-host -U your-user -d your-database -f migrations/restore_items_from_backup_with_new_ids.sql
```

#### วิธีที่ 3: ใช้ Supabase CLI

```bash
supabase db execute < migrations/restore_items_from_backup_with_new_ids.sql
```

### 4. ตรวจสอบผลลัพธ์

หลังจาก run migration จะได้:

#### ตารางแสดง ID Mapping
```
old_id                                | new_id                                | item_name              | status
--------------------------------------|---------------------------------------|------------------------|----------
550e8400-e29b-41d4-a716-446655440000 | 123e4567-e89b-12d3-a456-426614174000 | ข้าวเหนียว             | ✓ Migrated
...
```

#### Summary Report
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

### 5. Update Foreign Key References (ถ้าจำเป็น)

ถ้าคุณต้องการ update references ในตารางอื่นๆ ให้ uncomment section นี้ในไฟล์ migration:

```sql
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
```

**หมายเหตุ:** `item_id_mapping` เป็น temporary table ที่จะหายไปเมื่อ disconnect จาก database
หากต้องการเก็บ mapping ไว้ถาวร ให้ uncomment section สุดท้ายที่สร้าง `item_id_migration_log` table

## การตรวจสอบหลัง Migration

### ตรวจสอบจำนวน Items

```sql
SELECT 
  (SELECT COUNT(*) FROM items_backup) as backup_count,
  (SELECT COUNT(*) FROM items) as items_count;
```

### ตรวจสอบว่า UUID ถูกสร้างใหม่

```sql
-- ดู items ที่มี ID ใหม่
SELECT id, name, created_at 
FROM items 
ORDER BY name
LIMIT 10;

-- ตรวจสอบว่า UUID format ถูกต้อง
SELECT id, 
       length(id::text) as id_length,  -- ควรเป็น 36
       name
FROM items
LIMIT 5;
```

### ตรวจสอบข้อมูลอื่นๆ

```sql
-- ตรวจสอบว่าข้อมูลครบถ้วน
SELECT 
  COUNT(*) as total_items,
  COUNT(DISTINCT category_id) as categories,
  COUNT(CASE WHEN type = 'standalone' THEN 1 END) as standalone_items,
  COUNT(CASE WHEN type = 'saleonly' THEN 1 END) as saleonly_items,
  COUNT(CASE WHEN is_recipe = true THEN 1 END) as recipe_items
FROM items;
```

## การบันทึก ID Mapping ถาวร (Optional)

หากต้องการเก็บ mapping ระหว่าง old ID และ new ID ไว้อ้างอิงในอนาคต:

```sql
-- สร้าง permanent log table
CREATE TABLE IF NOT EXISTS item_id_migration_log (
  old_id UUID,
  new_id UUID,
  item_name TEXT,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (old_id)
);

-- บันทึก mapping จาก temp table
INSERT INTO item_id_migration_log (old_id, new_id, item_name)
SELECT old_id, new_id, item_name
FROM item_id_mapping;

-- Query mapping ในภายหลัง
SELECT * FROM item_id_migration_log;
```

## Rollback (กู้คืน)

หากต้องการ rollback กลับไปใช้ข้อมูลเดิม:

```sql
-- 1. ลบ items ปัจจุบัน
TRUNCATE TABLE items CASCADE;

-- 2. Copy จาก backup กลับมา (ใช้ ID เดิม)
INSERT INTO items 
SELECT * FROM items_backup;
```

## สิ่งที่ต้องทำหลัง Migration

1. **รีสตาร์ท Next.js Application** เพื่อ clear cache
2. **ทดสอบ POS Page** - ตรวจสอบว่า items แสดงถูกต้อง
3. **ทดสอบ Items Page** - ตรวจสอบว่า CRUD ทำงานได้
4. **ทดสอบ Checkout** - ทำการขายทดสอบ
5. **ตรวจสอบ Inventory** - ตรวจสอบว่า stock tracking ทำงานถูกต้อง

## Troubleshooting

### ปัญหา: items_backup table ไม่มี

```sql
-- สร้าง backup ก่อน
CREATE TABLE items_backup AS SELECT * FROM items;
```

### ปัญหา: UUID extension ไม่มี

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### ปัญหา: Foreign key violations

หากมี foreign key constraints ที่ป้องกันการลบ:

```sql
-- Disable foreign key checks ชั่วคราว (ระวังใช้!)
SET session_replication_role = 'replica';

-- Run migration

-- Enable foreign key checks กลับ
SET session_replication_role = 'origin';
```

## เปรียบเทียบก่อนและหลัง Migration

| Aspect | Before | After |
|--------|--------|-------|
| Item IDs | Old UUIDs | New auto-generated UUIDs |
| Item data | In items_backup | In items table |
| Order | Original creation order | Preserved |
| Foreign keys | May point to old IDs | Need manual update |
| Stock data | Same | Same |

## Checklist

- [ ] Backup database ทำแล้ว
- [ ] ตรวจสอบ items_backup มีข้อมูลครบ
- [ ] Run migration สำเร็จ
- [ ] ตรวจสอบจำนวน items ตรงกัน
- [ ] ตรวจสอบ UUID ใหม่ถูกสร้าง
- [ ] Update foreign key references (ถ้าจำเป็น)
- [ ] บันทึก ID mapping (optional)
- [ ] ทดสอบ POS page
- [ ] ทดสอบ Items page
- [ ] ทดสอบ Checkout
- [ ] รีสตาร์ท application

## ไฟล์ที่เกี่ยวข้อง

- **Migration:** `migrations/restore_items_from_backup_with_new_ids.sql`
- **Previous Migration:** `migrations/regenerate_items_ids_only.sql`
- **Auto UUID Setup:** `migrations/add_auto_uuid_to_items.sql`

---

**Last Updated:** 2026-06-17
**Version:** 1.0
