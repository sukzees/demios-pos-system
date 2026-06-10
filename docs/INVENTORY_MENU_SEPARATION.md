# การแยก Inventory และ Menu Items

## ปัญหา
เดิม: เมื่อสร้าง item ใน Inventory จะแสดงใน Items & Categories ทันที (ใช้ตาราง items เดียวกัน)

## วิธีแก้ไข
เพิ่มฟิลด์ `show_in_menu` ในตาราง `items` เพื่อควบคุมว่า item ไหนควรแสดงในเมนู

## SQL Migration

```sql
-- เพิ่มฟิลด์ show_in_menu ในตาราง items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT false;

-- อัปเดต items ที่มีอยู่แล้วให้เป็น true (เพื่อไม่ให้เมนูเดิมหาย)
UPDATE items 
SET show_in_menu = true 
WHERE show_in_menu IS NULL OR show_in_menu = false;

-- สร้าง index เพื่อ performance
CREATE INDEX IF NOT EXISTS idx_items_show_in_menu ON items(show_in_menu);
```

## การทำงาน

### 1. Inventory Page
- เมื่อสร้าง item ใหม่: `show_in_menu = false` (ไม่แสดงในเมนู)
- เมื่อแก้ไข item: สามารถเปิด/ปิด `show_in_menu` ได้
- แสดงทุก items ไม่ว่า `show_in_menu` จะเป็นอะไร

### 2. Items & Categories Page
- แสดงเฉพาะ items ที่ `show_in_menu = true`
- มีปุ่ม "Add from Inventory" เพื่อเลือก items จาก Inventory มาแสดงในเมนู
- เมื่อสร้าง Recipe หรือ Sale Only: `show_in_menu = true` (แสดงทันที)

### 3. POS Page
- แสดงเฉพาะ items ที่ `show_in_menu = true`
- รวมกับ recipes ทั้งหมด

## ประโยชน์
✅ แยก Inventory กับ Menu ชัดเจน
✅ ควบคุมได้ว่าเมนูไหนให้ขาย
✅ Inventory items ที่ไม่ต้องการขาย (วัตถุดิบ) จะไม่แสดงใน POS
✅ สามารถเลือก items จาก Inventory มาขายได้ทีหลัง

## วันที่: 14 พฤษภาคม 2026
