# คู่มือการ Migrate Inventory Items

## ภาพรวม

การ migration นี้จะแยก Inventory items และ Menu items ออกจากกันโดยสมบูรณ์:
- **Inventory items** → `inventory_items` table
- **Menu items** → `items` table

---

## ขั้นตอนการ Migration

### ตัวเลือก 1: Migration แบบทีละขั้นตอน (แนะนำสำหรับ Production)

#### Step 1: สร้าง Table และ Columns
```sql
-- รันไฟล์นี้ก่อน
migrations/add_inventory_items_table.sql
```

#### Step 2: Migrate ข้อมูล
```sql
-- จากนั้นรันไฟล์นี้
migrations/migrate_existing_inventory_items.sql
```

#### Step 3: ตรวจสอบข้อมูล
```sql
-- ตรวจสอบว่า migration สำเร็จ
SELECT type, COUNT(*) as count 
FROM public.inventory_items 
GROUP BY type;

-- ตรวจสอบ Menu items
SELECT COUNT(*) as menu_items_count 
FROM public.items 
WHERE category_id IS NOT NULL;
```

#### Step 4: ลบข้อมูลเก่า (ถ้าต้องการ)
```sql
-- ลบ inventory items ออกจาก items table
DELETE FROM public.items 
WHERE inventory_category_id IS NOT NULL;
```

---

### ตัวเลือก 2: Migration แบบ All-in-One (แนะนำสำหรับ Development)

```sql
-- รันไฟล์เดียวเท่านั้น
migrations/complete_inventory_separation.sql
```

ไฟล์นี้จะทำทุกอย่างอัตโนมัติ:
1. สร้าง `inventory_items` table
2. เพิ่ม column `type`
3. Migrate ข้อมูล
4. สร้าง indexes และ RLS policies
5. แสดง summary

---

## การตรวจสอบหลัง Migration

### 1. ตรวจสอบ Inventory Items

```sql
-- จำนวน items แยกตาม type
SELECT type, COUNT(*) as count 
FROM public.inventory_items 
GROUP BY type;

-- Expected output:
-- type        | count
-- ------------|------
-- standalone  | X
-- ingredient  | Y
```

### 2. ตรวจสอบ Items with Portions

```sql
-- Inventory items ที่มี portions
SELECT 
  ii.name, 
  ii.type, 
  COUNT(ip.id) as portion_count
FROM public.inventory_items ii
LEFT JOIN public.item_portions ip ON ip.item_id = ii.id
GROUP BY ii.id, ii.name, ii.type
HAVING COUNT(ip.id) > 0
ORDER BY portion_count DESC;
```

### 3. ตรวจสอบ Menu Items

```sql
-- Menu items ที่เหลือใน items table
SELECT type, COUNT(*) as count 
FROM public.items 
WHERE category_id IS NOT NULL 
GROUP BY type;
```

### 4. ตรวจสอบ Inventory Transactions

```sql
-- Transactions ที่อ้างอิงถึง inventory items
SELECT 
  it.transaction_type,
  COUNT(*) as count
FROM public.inventory_transactions it
INNER JOIN public.inventory_items ii ON it.item_id = ii.id
GROUP BY it.transaction_type;
```

---

## การ Rollback

หากต้องการย้อนกลับ:

```sql
-- 1. Backup ข้อมูลก่อน (ถ้าทำก่อน migration)
-- SELECT * INTO items_backup FROM public.items;

-- 2. ลบ inventory_items table
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- 3. ลบ column type จาก items
ALTER TABLE public.items DROP COLUMN IF EXISTS type;

-- 4. ลบ indexes
DROP INDEX IF EXISTS idx_items_type;
DROP INDEX IF EXISTS idx_inventory_items_inventory_category_id;
DROP INDEX IF EXISTS idx_inventory_items_type;

-- 5. ลบ schema version
DELETE FROM public.schema_version WHERE version IN ('2.4', '2.4.1');

-- 6. Restore จาก backup (ถ้ามี)
-- INSERT INTO public.items SELECT * FROM items_backup;
```

---

## ผลกระทบต่อแอปพลิเคชัน

### ไฟล์ที่ถูกอัพเดท:

1. **app/inventory/page.tsx**
   - ใช้ `inventory_items` table แทน `items`
   - ใช้ `type` แทน `is_recipe`

2. **app/items/page.tsx**
   - `getStandaloneInventoryItems()` ดึงจาก `inventory_items`
   - `getAvailableIngredients()` ดึงจาก `inventory_items`

3. **lib/store.ts**
   - `fetchItemsAndCategories()` โหลดทั้ง 2 tables

### การทดสอบหลัง Migration:

- ✅ Inventory page แสดง items ทั้งหมดถูกต้อง
- ✅ เพิ่ม/แก้ไข/ลบ inventory items ทำงานปกติ
- ✅ Items & Categories page แสดง menu items ถูกต้อง
- ✅ Linked Inventory Item dropdown แสดง standalone items
- ✅ Recipe ingredients dropdown แสดง ingredient items
- ✅ POS page โหลด items ถูกต้อง

---

## คำถามที่พบบ่อย (FAQ)

### Q: ข้อมูล portions จะย้ายไปด้วยหรือไม่?
**A:** ใช่! `item_portions` table ใช้ `item_id` ซึ่ง compatible กับทั้ง `items` และ `inventory_items` เพราะเรา migrate โดยใช้ ID เดิม

### Q: inventory_transactions จะยังทำงานหรือไม่?
**A:** ใช่! เพราะเรา migrate โดยใช้ ID เดิม ดังนั้น transactions ยังอ้างอิงถูกต้อง

### Q: ต้อง restart แอปพลิเคชันหรือไม่?
**A:** แนะนำให้ restart หลัง migration เสร็จ เพื่อให้แอปโหลดข้อมูลจาก table ใหม่

### Q: จะเกิดอะไรขึ้นกับ items ที่มีทั้ง category_id และ inventory_category_id?
**A:** Items ที่มี `inventory_category_id` จะถูก migrate ไปที่ `inventory_items` table

---

## เวอร์ชันที่เกี่ยวข้อง

- **Version 2.4**: เพิ่ม `inventory_items` table และ `type` columns
- **Version 2.4.1**: Migrate existing data

---

## ติดต่อสนับสนุน

หากพบปัญหาในการ migrate:
1. ตรวจสอบ error messages จาก SQL
2. รัน verification queries
3. ตรวจสอบว่าทุก table มี RLS policies
4. Rollback และลองใหม่ถ้าจำเป็น

---

**อัพเดทล่าสุด:** 15 มิถุนายน 2026
