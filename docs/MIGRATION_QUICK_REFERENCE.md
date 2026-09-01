# Migration Quick Reference

## การ Restore Items จาก Backup พร้อม UUID ใหม่

### ⚡ Quick Steps

```sql
-- 1. ตรวจสอบ backup
SELECT COUNT(*) FROM items_backup;

-- 2. Run migration
-- (Copy & paste จากไฟล์ migrations/restore_items_from_backup_with_new_ids.sql)

-- 3. ตรวจสอบผล
SELECT 
  (SELECT COUNT(*) FROM items_backup) as backup_count,
  (SELECT COUNT(*) FROM items) as migrated_count;
```

### 📋 Migration Order (สำหรับ Fresh Database)

ถ้าต้องการตั้งค่าใหม่ทั้งหมด ให้ run migrations ตามลำดับ:

1. **`add_inventory_items_table.sql`**
   - สร้าง inventory_items table

2. **`add_auto_uuid_to_items.sql`**
   - ตั้งค่า auto UUID generation สำหรับ items table

3. **`restore_items_from_backup_with_new_ids.sql`** ⭐ (ใหม่)
   - Restore items จาก backup พร้อม UUID ใหม่

4. **`migrate_existing_inventory_items.sql`**
   - Migrate ข้อมูล inventory

5. **`link_existing_items_to_inventory.sql`**
   - Link items กับ inventory_items

6. **`add_saleonly_type_to_items.sql`**
   - เพิ่ม type = 'saleonly' support

7. **`remove_stock_from_items.sql`**
   - ลบ stock column จาก items table

### 🔍 Verification Commands

```sql
-- ดูจำนวน items
SELECT COUNT(*) as total_items FROM items;

-- ดู UUID ใหม่
SELECT id, name FROM items LIMIT 5;

-- ดู ID mapping (ใช้ได้ระหว่าง session เท่านั้น)
SELECT * FROM item_id_mapping;

-- ตรวจสอบ type classification
SELECT 
  type,
  COUNT(*) as count
FROM items
GROUP BY type;
```

### 🚨 Emergency Rollback

```sql
-- กู้คืนจาก backup
TRUNCATE TABLE items CASCADE;
INSERT INTO items SELECT * FROM items_backup;
```

---

## การตั้งค่า Auto UUID (สำหรับตารางอื่นๆ)

### For Items Table
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
ALTER TABLE items ALTER COLUMN id SET DEFAULT uuid_generate_v4();
```

### For Other Tables (Template)
```sql
-- Replace 'table_name' with your table
ALTER TABLE table_name ALTER COLUMN id SET DEFAULT uuid_generate_v4();
```

---

## Common Issues & Solutions

### ❌ Problem: "items_backup does not exist"
```sql
-- Solution: Create backup first
CREATE TABLE items_backup AS SELECT * FROM items;
```

### ❌ Problem: "uuid-ossp extension does not exist"
```sql
-- Solution: Enable extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### ❌ Problem: "foreign key violation"
```sql
-- Solution: Use CASCADE (ระวัง - จะลบข้อมูลที่เกี่ยวข้อง)
TRUNCATE TABLE items CASCADE;
```

### ❌ Problem: "item_id_mapping not found" (หลังจาก disconnect)
```sql
-- Solution: Save to permanent table
CREATE TABLE item_id_migration_log AS 
SELECT * FROM item_id_mapping;
```

---

## Testing Checklist After Migration

- [ ] Items แสดงใน POS page
- [ ] Items แสดงใน Items & Categories page
- [ ] สามารถเพิ่ม item ใหม่ได้
- [ ] สามารถแก้ไข item ได้
- [ ] สามารถลบ item ได้
- [ ] Stock tracking ทำงานถูกต้อง
- [ ] Checkout process ทำงานได้
- [ ] Recipe items คำนวณ stock ถูกต้อง
- [ ] Standalone items link กับ inventory_items ถูกต้อง

---

## Files Reference

| File | Purpose |
|------|---------|
| `migrations/restore_items_from_backup_with_new_ids.sql` | **NEW** Restore with new UUIDs |
| `migrations/add_auto_uuid_to_items.sql` | Setup auto UUID |
| `migrations/regenerate_items_ids_only.sql` | Old regenerate (simple) |
| `migrations/regenerate_item_ids_with_uuid.sql` | Old regenerate (with FK) |
| `docs/RESTORE_ITEMS_FROM_BACKUP_GUIDE.md` | Full documentation |
| `docs/HOW_TO_RUN_MIGRATIONS.md` | General migration guide |

---

**Quick Links:**
- [Full Restore Guide](./RESTORE_ITEMS_FROM_BACKUP_GUIDE.md)
- [General Migration Guide](./HOW_TO_RUN_MIGRATIONS.md)
- [Inventory Separation](./INVENTORY_MENU_SEPARATION.md)
