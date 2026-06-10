# Table Workflow V6 - Auto-Show Table Selection on POS Entry

## Overview
ปรับ Flow การทำงานของหน้า POS ให้แสดงหน้าเลือกโต๊ะ/Takeout ก่อนเสมอ และแสดงเมนูสินค้าหลังจากเลือกแล้วเท่านั้น

## Implementation Status: ✅ COMPLETE

## Key Changes

### 1. Auto-Show Table Selection Modal
เมื่อเข้าหน้า POS และยังไม่ได้เลือกโต๊ะ/Takeout → แสดง TableSelection Modal อัตโนมัติ

```typescript
// Auto-show table selection when no table/orderType is selected
useEffect(() => {
  if (!currentTable && !currentOrderType) {
    setShowTableSelection(true);
  }
}, [currentTable, currentOrderType]);
```

### 2. Hide Menu Until Selection
ซ่อนเมนูสินค้าทั้งหมดจนกว่าจะเลือกโต๊ะ/Takeout แล้ว

```typescript
{(currentTable || currentOrderType) ? (
  <>
    {/* แสดงเมนูสินค้า */}
    <div className="border-b border-zinc-200 bg-white p-4">
      {/* Search & Categories */}
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      {/* Menu Items Grid */}
    </div>
  </>
) : (
  // แสดงหน้าเลือกโต๊ะ/Takeout
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <h3>เลือกประเภทการสั่ง</h3>
      <p>กรุณาเลือกโต๊ะหรือกลับบ้านเพื่อเริ่มสั่ง</p>
      <Button onClick={() => setShowTableSelection(true)}>
        เลือกโต๊ะ / Takeout
      </Button>
    </div>
  </div>
)}
```

### 3. Prevent Modal Close Before Selection
ป้องกันการปิด Modal ก่อนเลือกโต๊ะ/Takeout

#### ใน POS Page:
```typescript
<TableSelection
  onSelectTable={handleTableSelect}
  onClose={() => {
    // สามารถปิดได้ก็ต่อเมื่อเลือกโต๊ะ/orderType แล้ว
    if (currentTable || currentOrderType) {
      setShowTableSelection(false);
    }
  }}
  canClose={!!(currentTable || currentOrderType)}
/>
```

#### ใน TableSelection Component:
```typescript
interface TableSelectionProps {
  onSelectTable: (table: Table | null, orderType: 'dine-in' | 'takeout') => void;
  onClose: () => void;
  canClose?: boolean; // ควบคุมว่าสามารถปิดได้หรือไม่
}

// ซ่อนปุ่ม X ถ้า canClose = false
{canClose && (
  <Button variant="ghost" size="icon" onClick={onClose}>
    <X className="h-5 w-5" />
  </Button>
)}

// ป้องกันการปิดโดยคลิกข้างนอก
<div 
  onClick={(e) => {
    if (canClose && e.target === e.currentTarget) {
      onClose();
    }
  }}
>
```

## User Flow

### Flow ใหม่:
1. **เข้าหน้า POS** → แสดง TableSelection Modal (บังคับเลือก)
2. **เลือกโต๊ะ/Takeout** → Modal ปิด, แสดงเมนูสินค้า
3. **เพิ่มสินค้าลงตะกร้า** → ทำงานปกติ
4. **กดปุ่ม "กลับไปเลือก"** → แสดง Modal อีกครั้ง (สามารถปิดได้)
5. **เลือกโต๊ะ/Takeout ใหม่** → โหลด cart ของโต๊ะนั้น

### Flow เก่า (ก่อนแก้ไข):
1. เข้าหน้า POS → แสดงเมนูทันที
2. ต้องกดปุ่ม "Select Table" เอง
3. เลือกโต๊ะ/Takeout

## UI/UX Improvements

### 1. Welcome Screen (เมื่อยังไม่เลือกโต๊ะ)
- แสดงไอคอนโต๊ะขนาดใหญ่
- ข้อความชัดเจน: "เลือกประเภทการสั่ง"
- ปุ่มใหญ่เด่นชัด: "เลือกโต๊ะ / Takeout"
- พื้นหลัง gradient สวยงาม

### 2. Modal Behavior
- **ครั้งแรก**: ไม่มีปุ่ม X, ไม่สามารถปิดโดยคลิกข้างนอก
- **ครั้งถัดไป**: มีปุ่ม X, สามารถปิดได้

### 3. Table Info Bar
- แสดงข้อมูลโต๊ะ/Takeout ที่เลือก
- ปุ่ม "กลับไปเลือก" สำหรับเปลี่ยนโต๊ะ
- ปุ่ม "รวมโต๊ะ" และ "แยกโต๊ะ" (สำหรับ Dine-In)

## Translations Added

### English:
- `selectOrderType`: "Select Order Type"
- `selectTableOrTakeout`: "Please select a table or takeout to start ordering"

### Lao:
- `selectOrderType`: "ເລືອກປະເພດການສັ່ງ"
- `selectTableOrTakeout`: "ກະລຸນາເລືອກໂຕະຫຼືກັບບ້ານເພື່ອເລີ່ມສັ່ງ"

### Thai:
- `selectOrderType`: "เลือกประเภทการสั่ง"
- `selectTableOrTakeout`: "กรุณาเลือกโต๊ะหรือกลับบ้านเพื่อเริ่มสั่ง"

## Benefits

1. **ชัดเจนขึ้น**: พนักงานรู้ว่าต้องเลือกโต๊ะก่อนเสมอ
2. **ป้องกันข้อผิดพลาด**: ไม่สามารถเพิ่มสินค้าโดยไม่ระบุโต๊ะ
3. **UX ดีขึ้น**: Flow การทำงานเป็นขั้นตอนที่ชัดเจน
4. **ลดความสับสน**: ไม่มีสถานะ "ยังไม่ได้เลือกโต๊ะ" ที่คลุมเครือ

## Technical Details

### Files Modified:
1. **app/pos/page.tsx**
   - เพิ่ม `useEffect` สำหรับ auto-show modal
   - เพิ่ม conditional rendering สำหรับเมนู
   - เพิ่ม welcome screen
   - เพิ่ม translations
   - ส่ง prop `canClose` ไปยัง TableSelection

2. **components/table-selection.tsx**
   - เพิ่ม prop `canClose?: boolean`
   - ซ่อนปุ่ม X เมื่อ `canClose = false`
   - ป้องกันการปิดโดยคลิกข้างนอกเมื่อ `canClose = false`

### State Management:
```typescript
// POS Page State
const [showTableSelection, setShowTableSelection] = useState(false);
const { currentTable, currentOrderType } = usePosStore();

// Auto-show logic
useEffect(() => {
  if (!currentTable && !currentOrderType) {
    setShowTableSelection(true);
  }
}, [currentTable, currentOrderType]);
```

## Testing Checklist

- [x] เข้าหน้า POS ครั้งแรก → แสดง Modal อัตโนมัติ
- [x] Modal ไม่มีปุ่ม X เมื่อยังไม่เลือก
- [x] ไม่สามารถปิด Modal โดยคลิกข้างนอก
- [x] เลือกโต๊ะ → Modal ปิด, แสดงเมนู
- [x] เลือก Takeout → Modal ปิด, แสดงเมนู
- [x] กดปุ่ม "กลับไปเลือก" → แสดง Modal (มีปุ่ม X)
- [x] สามารถปิด Modal ได้เมื่อเลือกโต๊ะแล้ว
- [x] ไม่แสดงเมนูเมื่อยังไม่เลือกโต๊ะ
- [x] แสดง welcome screen เมื่อยังไม่เลือกโต๊ะ
- [x] No diagnostics errors

## Related Features

- **V5**: Separate cart per table/takeout
- **V4**: Merge/Split tables
- **V3**: Separate Dine-In and Takeout tabs
- **V2**: Allow re-entering occupied tables
- **V1**: Initial table selection system

## Version History

- **V6** (2026-05-07): Auto-show table selection, hide menu until selection
- **V5**: Separate cart per table/takeout with savedCarts
- **V4**: Merge/Split tables system
- **V3**: Separate Dine-In and Takeout tabs
- **V2**: Allow re-entering occupied tables
- **V1**: Initial table selection system

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
