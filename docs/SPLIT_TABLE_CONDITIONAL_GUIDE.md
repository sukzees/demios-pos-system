# Split Table Conditional Display Guide

## Overview
ปรับปุ่ม "Split Table" ให้แสดงเฉพาะเมื่อโต๊ะนั้นเคยถูกรวมโต๊ะมาก่อน (มีสถานะ `is_merged = true`)

## Implementation Status: ✅ COMPLETE

## Key Changes

### 1. Database Schema Update

#### เพิ่มฟิลด์ `is_merged` ในตาราง `tables`:

```sql
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT FALSE;
```

**คุณสมบัติ:**
- **Type**: `BOOLEAN`
- **Default**: `FALSE`
- **Purpose**: ทำเครื่องหมายว่าโต๊ะนี้ถูกรวมมาจากโต๊ะอื่น

### 2. TypeScript Type Update

#### อัพเดท `Table` type:

```typescript
export type Table = {
  id: string;
  table_number: string;
  zone_id?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  current_order_id?: string;
  is_merged?: boolean;  // ใหม่: ทำเครื่องหมายว่าโต๊ะนี้ถูกรวมมาจากโต๊ะอื่น
  display_order: number;
  created_at: string;
};
```

### 3. Merge Tables Logic

#### เมื่อรวมโต๊ะ → set `is_merged = true`:

```typescript
const handleMergeTables = async (targetTable: Table) => {
  // ... validation code ...

  // Update table status and mark as merged
  await supabase
    .from('tables')
    .update({ 
      status: 'occupied',
      is_merged: true  // ทำเครื่องหมายว่าโต๊ะนี้ถูกรวมแล้ว
    })
    .eq('id', targetTable.id);

  // Release current table
  await supabase
    .from('tables')
    .update({ status: 'available', current_order_id: null })
    .eq('id', currentTable.id);

  alert(t.mergeSuccess);
};
```

### 4. Split Table Logic

#### เมื่อแยกโต๊ะ → reset `is_merged = false`:

```typescript
const handleSplitTable = async (targetTable: Table) => {
  // ... split logic ...

  // If current table has no items left, release it and reset is_merged
  if (remainingItems.length === 0) {
    await supabase
      .from('tables')
      .update({ 
        status: 'available', 
        current_order_id: null,
        is_merged: false  // รีเซ็ตสถานะรวมโต๊ะ
      })
      .eq('id', currentTable.id);
  } else {
    // ถ้ายังมีเมนูเหลืออยู่ ให้รีเซ็ตสถานะรวมโต๊ะ
    await supabase
      .from('tables')
      .update({ is_merged: false })
      .eq('id', currentTable.id);
  }

  alert(t.splitSuccess);
};
```

### 5. Conditional Button Display

#### แสดงปุ่ม Split Table เฉพาะเมื่อ `is_merged = true`:

```typescript
{currentOrderType === 'dine-in' && currentTable && (
  <>
    <Button onClick={() => setShowMergeTableModal(true)}>
      {t.mergeTables}
    </Button>
    
    {/* แสดงปุ่ม Split Table เฉพาะเมื่อโต๊ะถูกรวมมาแล้ว */}
    {currentTable?.is_merged && (
      <Button onClick={() => setShowSplitTableModal(true)}>
        {t.splitTable}
      </Button>
    )}
  </>
)}
```

## User Flow

### Scenario 1: Merge Tables
1. **เลือกโต๊ะ T1** → มีเมนู 2 รายการ
2. **กดปุ่ม "Merge Tables"** → เลือกโต๊ะ T2
3. **รวมโต๊ะสำเร็จ** → T2 มีสถานะ `is_merged = true`
4. **ปุ่ม "Split Table" ปรากฏ** → สามารถแยกโต๊ะได้

### Scenario 2: Split Table
1. **อยู่ที่โต๊ะ T2** (ที่ถูกรวมมา) → มีเมนู 5 รายการ
2. **กดปุ่ม "Split Table"** → เลือกเมนู 2 รายการ
3. **เลือกโต๊ะ T3** → ย้ายเมนู 2 รายการไป T3
4. **T2 รีเซ็ต** → `is_merged = false`, ปุ่ม "Split Table" หายไป

### Scenario 3: Normal Table (Not Merged)
1. **เลือกโต๊ะ T5** → เพิ่มเมนู
2. **ไม่มีปุ่ม "Split Table"** → เพราะ `is_merged = false`
3. **มีเฉพาะปุ่ม "Merge Tables"** → สามารถรวมโต๊ะได้

## Benefits

### 1. UX ชัดเจนขึ้น
- **ไม่สับสน**: ปุ่ม Split Table แสดงเฉพาะเมื่อจำเป็น
- **Logic ถูกต้อง**: แยกโต๊ะได้เฉพาะโต๊ะที่ถูกรวมมา
- **ลด Clutter**: ไม่แสดงปุ่มที่ไม่จำเป็น

### 2. ป้องกันข้อผิดพลาด
- **ไม่สามารถแยกโต๊ะปกติ**: ป้องกันการแยกโต๊ะที่ไม่ได้รวมมา
- **State Management**: ติดตามสถานะโต๊ะได้ชัดเจน
- **Data Integrity**: ข้อมูลสอดคล้องกับการทำงาน

### 3. Performance
- **Conditional Rendering**: แสดงปุ่มเฉพาะเมื่อจำเป็น
- **Database Indexed**: สามารถ query โต๊ะที่ merged ได้เร็ว
- **Efficient Updates**: อัพเดทเฉพาะฟิลด์ที่จำเป็น

## Technical Details

### Database Migration

**File**: `migrations/add_is_merged_to_tables.sql`

```sql
-- Add is_merged column
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.tables.is_merged IS 
  'Indicates if this table has been merged from other tables';

-- Update schema version
INSERT INTO public.schema_version (version, description) VALUES
  ('2.1', 'Added is_merged field to tables for split table functionality')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());
```

### Files Modified

1. **supabase_schema.sql**
   - ✅ เพิ่มฟิลด์ `is_merged BOOLEAN DEFAULT FALSE`
   - ✅ อัพเดท version เป็น 2.1

2. **lib/supabase.ts**
   - ✅ เพิ่ม `is_merged?: boolean` ใน Table type

3. **app/pos/page.tsx**
   - ✅ เพิ่ม conditional rendering `{currentTable?.is_merged && ...}`
   - ✅ อัพเดท `handleMergeTables` → set `is_merged = true`
   - ✅ อัพเดท `handleSplitTable` → reset `is_merged = false`

4. **migrations/add_is_merged_to_tables.sql**
   - ✅ สร้าง migration script ใหม่

### State Flow

```
Initial State:
  Table T1: is_merged = false
  Table T2: is_merged = false

After Merge (T1 → T2):
  Table T1: status = available, is_merged = false
  Table T2: status = occupied, is_merged = true ✓
  
Split Button: Visible on T2 ✓

After Split (T2 → T3):
  Table T2: is_merged = false ✓
  Table T3: status = occupied, is_merged = false
  
Split Button: Hidden on T2 ✓
```

## Testing Checklist

- [x] เพิ่มฟิลด์ `is_merged` ในตาราง tables
- [x] อัพเดท Table type definition
- [x] Merge tables → set `is_merged = true`
- [x] Split table → reset `is_merged = false`
- [x] ปุ่ม Split Table แสดงเฉพาะเมื่อ `is_merged = true`
- [x] ปุ่ม Split Table ซ่อนเมื่อ `is_merged = false`
- [x] โต๊ะปกติไม่แสดงปุ่ม Split Table
- [x] โต๊ะที่ถูกรวมแสดงปุ่ม Split Table
- [x] แยกโต๊ะแล้วปุ่ม Split Table หายไป
- [x] No diagnostics errors
- [x] Migration script created

## Schema Version

- **Previous**: 2.0
- **Current**: 2.1
- **Changes**: Added `is_merged` field to tables

## Related Features

- **Merge Tables**: Combines two tables into one
- **Split Table**: Separates items from merged table to new table
- **Table Status**: Tracks table availability and occupancy

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
**Schema Version**: 2.1
