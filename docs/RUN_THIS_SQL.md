# 🔴 สำคัญ: รัน SQL นี้ใน Supabase ก่อนใช้งาน

## วิธีรัน SQL Migration

1. เข้าไปที่ **Supabase Dashboard** → เลือก Project ของคุณ
2. ไปที่ **SQL Editor** (เมนูด้านซ้าย)
3. คลิก **New Query**
4. คัดลอกโค้ด SQL ด้านล่างไปวาง
5. คลิก **RUN** (หรือกด Ctrl+Enter)

---

## SQL Code

```sql
-- Migration: Add show_in_menu field to items table
-- Date: 2026-05-14
-- Purpose: Separate Inventory items from Menu items

-- Step 1: Add the column
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT false;

-- Step 2: Update existing items to show in menu (preserve current behavior)
UPDATE items 
SET show_in_menu = true 
WHERE show_in_menu IS NULL OR show_in_menu = false;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_show_in_menu ON items(show_in_menu);

-- Step 4: Add comment to describe the column
COMMENT ON COLUMN items.show_in_menu IS 'Whether this item should be displayed in the menu and POS. false = Inventory only, true = Show in menu';
```

---

## ตรวจสอบว่ารันสำเร็จ

รันคำสั่งนี้เพื่อตรวจสอบ:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'items' AND column_name = 'show_in_menu';
```

ถ้าเห็น row แสดงว่าสำเร็จแล้ว!

---

## หมายเหตุ
- Items ที่มีอยู่แล้วจะถูกตั้งค่าเป็น `show_in_menu = true` ทั้งหมด (เพื่อไม่ให้เมนูเดิมหาย)
- Items ใหม่ที่สร้างใน Inventory จะเป็น `show_in_menu = false` (ไม่แสดงในเมนู)
- สามารถเปิด/ปิดได้ในหน้า Inventory หรือ Items & Categories

---

**⚠️ รัน SQL นี้ก่อนใช้งานโปรแกรมที่ build ใหม่**
