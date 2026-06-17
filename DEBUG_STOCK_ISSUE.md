# Debug: Stock Issue - Out of Stock Problem

## ปัญหาที่พบ
จาก Console Log:
```
[STANDALONE] ເຂົ້າຫນຽວ/ບາດຊິ້ນ:
  itemId: 'cfe73b0f-8dc4-41d3-a7b2-090bd241d46e'
  inventory_item_id: 'cfe73b0f-8dc4-41d3-a7b2-090bd241d46e'  // ← ชี้ไปหาตัวเองเดียวกัน
  linkedInvItem: {...}  // ← empty object (ไม่เจอ)
  calculatedStock: 0
  itemType: 'standalone'
```

## สาเหตุ
`inventory_item_id` ใน items table ชี้ไปหา ID เดียวกับตัวมันเอง แทนที่จะชี้ไปหา inventory_items table

## วิธีแก้

### Option 1: ใช้ stock จาก items table โดยตรง (Quick Fix)
เนื่องจาก migration `remove_stock_from_items.sql` ยังไม่ได้ run บน database จริง items table ยังมี stock column อยู่

แก้ไขโดยให้ standalone items ใช้ stock จาก items table เองก่อน จนกว่า:
1. จะมีการสร้าง inventory_items table จริงๆ
2. จะมีการ link ระหว่าง items และ inventory_items ถูกต้อง
3. จะ run migration ที่ drop stock column

### Option 2: สร้าง inventory_items table และ migrate data (Proper Fix)
1. Run migration `add_inventory_items_table.sql`
2. Run migration `migrate_existing_inventory_items.sql` 
3. Run migration `link_existing_items_to_inventory.sql`
4. Run migration `remove_stock_from_items.sql`

## แนะนำ: Quick Fix
เนื่องจาก database ยังไม่พร้อม ให้ใช้ fallback logic:
- ถ้า linkedInvItem เป็น empty/null → ใช้ stock จาก item เอง
