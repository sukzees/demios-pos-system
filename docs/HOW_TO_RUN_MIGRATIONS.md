# How to Run Migrations

## วิธีการ Run Migration ใน Supabase

### ขั้นตอน:

1. **เปิด Supabase Dashboard**
   - ไปที่ https://supabase.com/dashboard
   - เลือก Project ของคุณ

2. **เปิด SQL Editor**
   - คลิกที่เมนู "SQL Editor" ทางด้านซ้าย
   - หรือกด `⌘ + K` (Mac) / `Ctrl + K` (Windows) แล้วพิมพ์ "SQL Editor"

3. **Run Migration**
   - คลิก "New query" 
   - Copy เนื้อหาจากไฟล์ migration ที่ต้องการ
   - Paste ลงใน SQL Editor
   - คลิก "Run" หรือกด `⌘ + Enter` (Mac) / `Ctrl + Enter` (Windows)

4. **ตรวจสอบผลลัพธ์**
   - ดูที่ส่วน "Results" ด้านล่าง
   - ถ้าสำเร็จจะแสดง "Success" พร้อม query ที่ run

---

## Migrations ที่ต้อง Run (ตามลำดับ)

### 1. เพิ่ม Auto UUID Generation สำหรับ items table
**ไฟล์:** `migrations/add_auto_uuid_to_items.sql`

**คำอธิบาย:** 
- เพิ่มการ generate UUID อัตโนมัติสำหรับ id column ใน items table
- หลังจาก run แล้ว เวลา INSERT ข้อมูลใหม่ไม่ต้องระบุ id

**ผลลัพธ์:**
```sql
-- เดิม: ต้องระบุ id
INSERT INTO items (id, name, price, category_id) 
VALUES ('uuid-here', 'Item Name', 10.00, 'cat-id');

-- หลัง run migration: ไม่ต้องระบุ id
INSERT INTO items (name, price, category_id) 
VALUES ('Item Name', 10.00, 'cat-id');
-- id จะถูก generate อัตโนมัติ
```

**SQL:**
```sql
-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add default UUID generation for items table
ALTER TABLE public.items 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

COMMENT ON COLUMN public.items.id IS 'Auto-generated UUID primary key';
```

---

### 2. เพิ่ม inventory_item_id column ใน items table
**ไฟล์:** `migrations/add_inventory_item_id_to_items.sql`

**คำอธิบาย:**
- เพิ่ม column `inventory_item_id` สำหรับ link standalone items ไปหา inventory_items

**SQL:**
```sql
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_inventory_item_id ON public.items(inventory_item_id);

COMMENT ON COLUMN public.items.inventory_item_id IS 'Link to inventory_items for standalone items';
```

---

### 3. เพิ่m inventory_item_id ใน item_portions table
**ไฟล์:** `migrations/add_inventory_item_id_to_portions.sql`

**คำอธิบาย:**
- เพิ่ม column `inventory_item_id` ใน item_portions table
- อนุญาตให้ portions link ไปหา inventory_items ได้

---

### 4. เพิ่ม 'saleonly' type ใน items table
**ไฟล์:** `migrations/add_saleonly_type_to_items.sql`

**คำอธิบาย:**
- เพิ่ม 'saleonly' เป็น type ที่อนุญาตใน items table
- Sale Only items ไม่ track stock

**SQL:**
```sql
ALTER TABLE public.items 
DROP CONSTRAINT IF EXISTS items_type_check;

ALTER TABLE public.items 
ADD CONSTRAINT items_type_check 
CHECK (type IN ('standalone', 'saleonly'));
```

---

### 5. ลบ stock column จาก items table (Optional - Run เมื่อพร้อม)
**ไฟล์:** `migrations/remove_stock_from_items.sql`

**⚠️ คำเตือน:**
- Migration นี้จะ **ลบข้อมูล stock** ใน items table ถาวร
- ควร run เฉพาะเมื่อมั่นใจว่า:
  1. มี inventory_items table พร้อมใช้งาน
  2. มีการ link items กับ inventory_items ครบถ้วน
  3. Code ทั้งหมดใช้ inventory_items แทน items.stock แล้ว

**SQL:**
```sql
ALTER TABLE public.items 
DROP COLUMN IF EXISTS stock;
```

---

## ตรวจสอบว่า Migration Run สำเร็จหรือไม่

### ตรวจสอบ Auto UUID:
```sql
-- ทดสอบ insert โดยไม่ระบุ id
INSERT INTO items (name, price, category_id) 
VALUES ('Test Item', 10.00, 'your-category-id')
RETURNING id;

-- ควรได้ UUID กลับมา เช่น: '550e8400-e29b-41d4-a716-446655440000'
```

### ตรวจสอบ Column ที่เพิ่ม:
```sql
-- ดู columns ทั้งหมดใน items table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'items' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### ตรวจสอบ Constraints:
```sql
-- ดู constraints ของ items table
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.items'::regclass;
```

---

## Rollback (ถ้าต้องการยกเลิก)

### Rollback Auto UUID:
```sql
ALTER TABLE public.items 
ALTER COLUMN id DROP DEFAULT;
```

### Rollback inventory_item_id:
```sql
DROP INDEX IF EXISTS idx_items_inventory_item_id;
ALTER TABLE public.items 
DROP COLUMN IF EXISTS inventory_item_id;
```

### Rollback saleonly type:
```sql
ALTER TABLE public.items 
DROP CONSTRAINT IF EXISTS items_type_check;

ALTER TABLE public.items 
ADD CONSTRAINT items_type_check 
CHECK (type IN ('standalone', 'ingredient', 'recipe'));
```

---

## Tips

1. **ทดสอบก่อน** - ลอง run ใน Development environment ก่อน Production
2. **Backup** - Backup database ก่อน run migration ที่ลบข้อมูล
3. **Run ทีละ migration** - อย่า run พร้อมกันหลาย migration
4. **ตรวจสอบผล** - ตรวจสอบว่า migration run สำเร็จก่อนไปต่อ
5. **Documentation** - บันทึกว่า migration ไหนถูก run ไปแล้ว

---

*Last Updated: 2026-06-17*
