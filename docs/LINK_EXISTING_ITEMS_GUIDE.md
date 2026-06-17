# Guide: Link Existing Items to Inventory

## Overview
หลังจากเพิ่ม `inventory_item_id` column แล้ว ต้อง link รายการเมนูที่มีอยู่แล้วเข้ากับ inventory items

## Prerequisites
1. ✅ รัน migration `add_inventory_item_id_to_items.sql` แล้ว
2. ✅ มีข้อมูลใน `items` table ที่เป็น type = 'standalone'
3. ✅ มีข้อมูลใน `inventory_items` table ที่เป็น type = 'standalone'

## Migration Options

### Option 1: Automatic Link (แนะนำ)
สำหรับระบบที่ใช้ **ID เดียวกัน** ระหว่าง items และ inventory_items

**ขั้นตอน:**

1. เปิด Supabase SQL Editor
2. รันคำสั่งนี้เพื่อดูว่ามี items อะไรที่จะถูก link:

```sql
-- PREVIEW
SELECT 
  i.id,
  i.name,
  'Will link to inventory_item: ' || i.id as action
FROM public.items i
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.inventory_items ii 
    WHERE ii.id = i.id AND ii.type = 'standalone'
  );
```

3. ถ้าผลลัพธ์ถูกต้อง รันคำสั่งนี้เพื่อ link:

```sql
-- EXECUTE
UPDATE public.items i
SET inventory_item_id = i.id
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.inventory_items ii 
    WHERE ii.id = i.id AND ii.type = 'standalone'
  );
```

### Option 2: Link by Name & Category
สำหรับระบบที่ไม่ได้ใช้ ID เดียวกัน แต่ match กันด้วย name และ inventory_category_id

**ขั้นตอน:**

1. ดู items ที่จะถูก link:

```sql
-- PREVIEW
SELECT 
  i.id as item_id,
  i.name,
  ii.id as will_link_to_inventory_id,
  ii.name as inventory_name
FROM public.items i
JOIN public.inventory_items ii ON (
  i.name = ii.name 
  AND i.inventory_category_id = ii.inventory_category_id
  AND ii.type = 'standalone'
)
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL;
```

2. ถ้าถูกต้อง รันคำสั่ง update:

```sql
-- EXECUTE
UPDATE public.items i
SET inventory_item_id = ii.id
FROM public.inventory_items ii
WHERE 
  i.type = 'standalone' 
  AND i.inventory_item_id IS NULL
  AND i.name = ii.name
  AND i.inventory_category_id = ii.inventory_category_id
  AND ii.type = 'standalone';
```

### Option 3: Manual Link (สำหรับกรณีพิเศษ)
Link แต่ละรายการด้วยตนเอง

**ขั้นตอน:**

1. ดู items ที่ต้อง link:

```sql
SELECT 
  id,
  name,
  type,
  inventory_category_id
FROM public.items
WHERE type = 'standalone' 
  AND inventory_item_id IS NULL;
```

2. หา inventory_items ที่ต้องการ link:

```sql
SELECT 
  id,
  name,
  type,
  inventory_category_id
FROM public.inventory_items
WHERE type = 'standalone';
```

3. Link ทีละรายการ:

```sql
-- แทนที่ ID จริงลงไป
UPDATE public.items 
SET inventory_item_id = 'ใส่-inventory-item-id-ตรงนี้'
WHERE id = 'ใส่-item-id-ตรงนี้';
```

## Verification (ตรวจสอบผล)

### 1. ตรวจสอบจำนวนที่ link แล้ว:

```sql
SELECT 
  COUNT(*) as total_standalone,
  COUNT(inventory_item_id) as linked,
  COUNT(*) - COUNT(inventory_item_id) as unlinked
FROM public.items
WHERE type = 'standalone';
```

**ผลลัพธ์ที่ดี:**
- `linked` ควรเท่ากับ `total_standalone`
- `unlinked` ควรเป็น 0

### 2. ดูรายละเอียดที่ link แล้ว:

```sql
SELECT 
  i.id as item_id,
  i.name as menu_name,
  i.price as menu_price,
  i.inventory_item_id,
  ii.name as inventory_name,
  ii.stock,
  ii.cost_price
FROM public.items i
LEFT JOIN public.inventory_items ii ON i.inventory_item_id = ii.id
WHERE i.type = 'standalone'
ORDER BY i.name;
```

### 3. ตรวจสอบรายการที่ยังไม่ได้ link:

```sql
SELECT 
  id,
  name,
  type,
  inventory_category_id,
  'NEEDS MANUAL LINKING' as status
FROM public.items
WHERE type = 'standalone' 
  AND inventory_item_id IS NULL;
```

ถ้ายังมีรายการใน query นี้ ต้อง link ด้วย Option 3 (Manual)

## Migration Files

เราได้เตรียม migration files ไว้ให้:

### 1. `link_existing_items_to_inventory.sql`
- Migration แบบอัตโนมัติ
- ลองทั้ง same ID และ name+category matching
- รันได้เลยถ้าต้องการ

### 2. `link_existing_items_manual.sql`
- Migration แบบ manual ที่ปลอดภัย
- มี PREVIEW queries ให้ตรวจสอบก่อน
- แนะนำถ้าต้องการความระมัดระวังสูง

## Troubleshooting

### ปัญหา: หา inventory_item ไม่เจอ
**สาเหตุ:** ชื่อไม่ตรงกันหรือ inventory_category_id ไม่ตรงกัน

**วิธีแก้:**
```sql
-- ดูความแตกต่าง
SELECT 
  'Item' as source,
  id,
  name,
  inventory_category_id
FROM public.items
WHERE type = 'standalone' AND inventory_item_id IS NULL
UNION ALL
SELECT 
  'Inventory' as source,
  id,
  name,
  inventory_category_id
FROM public.inventory_items
WHERE type = 'standalone'
ORDER BY name, source;
```

### ปัญหา: Link ผิด item
**สาเหตุ:** มีชื่อซ้ำกัน

**วิธีแก้:**
```sql
-- หา duplicate names
SELECT name, COUNT(*)
FROM public.inventory_items
WHERE type = 'standalone'
GROUP BY name
HAVING COUNT(*) > 1;

-- ใช้ manual link แทน (Option 3)
```

### ปัญหา: inventory_item_id เป็น NULL หลัง migrate
**สาเหตุ:** ไม่มี matching inventory_item

**วิธีแก้:**
1. ตรวจสอบว่ามี inventory_item จริงหรือไม่
2. ถ้าไม่มี ต้องสร้างใน Inventory page ก่อน
3. หรือเปลี่ยน type เป็น 'recipe' หรือ 'saleOnly' แทน

## Best Practices

1. **ทดสอบก่อน:** รัน PREVIEW queries ก่อนทุกครั้ง
2. **Backup:** Backup database ก่อน run migration
3. **ทีละน้อย:** ถ้าไม่แน่ใจ ใช้ Manual Link ทีละรายการ
4. **ตรวจสอบ:** รัน Verification queries หลัง migrate

## After Migration

หลังจาก link เสร็จแล้ว:

1. ✅ ทดสอบเปิดหน้า Items & Categories → ควรเห็นรายการปกติ
2. ✅ ทดสอบกด Edit item → ควรเห็น Linked Inventory Item ถูกต้อง
3. ✅ ทดสอบสร้าง order → Stock ควรลดใน inventory_items
4. ✅ ตรวจสอบ POS page → เมนูควรแสดงปกติ

## Need Help?

ถ้ามีปัญหา:
1. ตรวจสอบ logs ใน browser console
2. รัน Verification queries ด้านบน
3. ดูที่ `link_existing_items_manual.sql` สำหรับ detailed steps
