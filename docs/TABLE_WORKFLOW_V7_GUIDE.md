# Table Workflow V7 - Full Page Table Selection & Takeout Hold Order

## Overview
ปรับปรุง UI/UX ของระบบเลือกโต๊ะและ Hold Order:
1. **เปลี่ยนจาก Modal เป็นหน้าเต็ม** - แสดงหน้าเลือกโต๊ะ/Takeout แบบเต็มหน้าจอ
2. **Takeout สามารถ Hold Order ได้** - ไม่ว่าจะส่งครัวแล้วหรือยัง

## Implementation Status: ✅ COMPLETE

## Key Changes

### 1. Full Page Table Selection (ไม่ใช่ Modal)

#### Before (V6):
- แสดงเป็น Modal ลอยอยู่กลางหน้าจอ
- มีพื้นหลังสีดำโปร่งแสง
- จำกัดขนาด max-width

#### After (V7):
- แสดงเป็นหน้าเต็มหน้าจอ
- ใช้พื้นที่ทั้งหมด
- UI เหมือนหน้าเมนูทั่วไป

```typescript
// ถ้ายังไม่ได้เลือกโต๊ะ/orderType ให้แสดงหน้าเลือกเต็มหน้าจอ
if (!currentTable && !currentOrderType) {
  return (
    <TableSelection
      onSelectTable={handleTableSelect}
      onClose={() => {}} // ไม่ต้องใช้ onClose เพราะเป็นหน้าเต็ม
      canClose={false}
    />
  );
}

return (
  <>
    {/* Table Selection as Full Page (when changing table) */}
    {showTableSelection && (
      <TableSelection
        onSelectTable={handleTableSelect}
        onClose={() => setShowTableSelection(false)}
        canClose={true}
      />
    )}
    {/* ... rest of POS page */}
  </>
);
```

### 2. TableSelection Component Changes

#### Before (Modal):
```typescript
return (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh]">
      {/* Content */}
    </div>
  </div>
);
```

#### After (Full Page):
```typescript
return (
  <div className="flex h-full bg-white">
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2>Select Order Type</h2>
        {canClose && <Button onClick={onClose}><X /></Button>}
      </div>
      {/* Content */}
    </div>
  </div>
);
```

### 3. Takeout Hold Order Support

#### Current Implementation (Already Working):
```typescript
holdOrder: async (note) => {
  const { cart, heldOrders, currentTable, currentOrderType } = get();
  if (cart.length === 0) return;

  const newHeldOrder = {
    id: `hold-${Date.now()}`,
    cart: [...cart],
    date: new Date().toISOString(),
    note,
    table: currentTable,
    orderType: currentOrderType  // บันทึก orderType (รวม takeout)
  };

  // Release table เฉพาะ dine-in เท่านั้น
  if (currentTable && currentOrderType === 'dine-in') {
    await supabase
      .from('tables')
      .update({ status: 'available', current_order_id: null })
      .eq('id', currentTable.id);
  }

  set({
    heldOrders: [...heldOrders, newHeldOrder],
    cart: [],
    currentTable: null,
    currentOrderType: null
  });
}
```

**คุณสมบัติ:**
- ✅ Takeout สามารถ Hold Order ได้
- ✅ บันทึกทั้งเมนูที่ส่งครัวแล้วและยังไม่ส่ง
- ✅ ไม่ release table (เพราะ takeout ไม่มีโต๊ะ)
- ✅ Resume Order กลับมาได้ปกติ

## User Flow

### Flow เมื่อเข้าหน้า POS:
1. **เข้าหน้า POS** → แสดงหน้าเลือกโต๊ะ/Takeout เต็มหน้าจอ
2. **เลือก Dine-In Tab** → แสดงรายการโต๊ะ
3. **เลือก Takeout Tab** → แสดงปุ่ม Takeout
4. **เลือกโต๊ะ/Takeout** → แสดงหน้าเมนูสินค้า

### Flow เมื่อเปลี่ยนโต๊ะ:
1. **กดปุ่ม "กลับไปเลือก"** → แสดงหน้าเลือกโต๊ะเต็มหน้าจอ (มีปุ่ม X)
2. **เลือกโต๊ะ/Takeout ใหม่** → กลับไปหน้าเมนู

### Flow Hold Order (Takeout):
1. **เลือก Takeout** → เพิ่มเมนู
2. **ส่งไปครัว** (หรือไม่ส่งก็ได้)
3. **กดปุ่ม Hold Order** → บันทึกออเด้อ
4. **Resume Order** → โหลดออเด้อกลับมา

## UI/UX Improvements

### 1. Full Page Experience
- **ใช้พื้นที่เต็มหน้าจอ** - เห็นโต๊ะได้มากขึ้น
- **ไม่มีพื้นหลังมืด** - ดูสะอาดตา
- **Navigation ชัดเจน** - มีปุ่ม X เมื่อสามารถปิดได้

### 2. Consistent Layout
- **Header เหมือนหน้าเมนู** - มี title และปุ่มปิด
- **Tabs เหมือนเดิม** - Dine-In และ Takeout
- **Grid Layout เหมือนเดิม** - แสดงโต๊ะแบบ grid

### 3. Better Mobile Experience
- **Full screen** - ใช้พื้นที่มือถือได้เต็มที่
- **No modal overlay** - ไม่มีปัญหาการ scroll
- **Touch friendly** - ปุ่มใหญ่กดง่าย

## Technical Details

### Files Modified:

#### 1. app/pos/page.tsx
**Changes:**
- ✅ ลบ `useEffect` auto-show modal
- ✅ เพิ่ม early return สำหรับแสดงหน้าเลือกโต๊ะเต็มหน้าจอ
- ✅ ลบ conditional rendering `{(currentTable || currentOrderType) ? (...) : (...)}`
- ✅ ลบ welcome screen
- ✅ แสดงเมนูตลอดเวลา (หลังเลือกโต๊ะแล้ว)

**Code:**
```typescript
// Early return for table selection
if (!currentTable && !currentOrderType) {
  return (
    <TableSelection
      onSelectTable={handleTableSelect}
      onClose={() => {}}
      canClose={false}
    />
  );
}

// Normal POS page
return (
  <>
    {showTableSelection && (
      <TableSelection
        onSelectTable={handleTableSelect}
        onClose={() => setShowTableSelection(false)}
        canClose={true}
      />
    )}
    {/* ... POS content */}
  </>
);
```

#### 2. components/table-selection.tsx
**Changes:**
- ✅ เปลี่ยนจาก `fixed inset-0` modal เป็น `flex h-full` full page
- ✅ ลบ `bg-black/50` overlay
- ✅ ลบ `rounded-2xl shadow-2xl max-w-6xl` modal styling
- ✅ ลบ click outside to close logic
- ✅ ใช้ `flex h-full` เพื่อเต็มหน้าจอ

**Code:**
```typescript
return (
  <div className="flex h-full bg-white">
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b">
        <h2>{t.selectOrderType}</h2>
        {canClose && (
          <Button onClick={onClose}>
            <X />
          </Button>
        )}
      </div>
      {/* Tabs and Content */}
    </div>
  </div>
);
```

#### 3. lib/store.ts
**No Changes Needed:**
- ✅ `holdOrder` function รองรับ takeout อยู่แล้ว
- ✅ บันทึก `orderType` และ `table`
- ✅ Release table เฉพาะ dine-in
- ✅ Resume order ทำงานปกติ

### State Management:

```typescript
// POS Page
const [showTableSelection, setShowTableSelection] = useState(false);
const { currentTable, currentOrderType } = usePosStore();

// Early return logic
if (!currentTable && !currentOrderType) {
  return <TableSelection ... />;
}
```

## Benefits

### 1. Better UX
- **เห็นโต๊ะได้มากขึ้น** - ใช้พื้นที่เต็มหน้าจอ
- **Navigation ชัดเจน** - ไม่สับสนว่าอยู่หน้าไหน
- **Consistent UI** - ทุกหน้าดูเหมือนกัน

### 2. Takeout Flexibility
- **Hold Order ได้** - สามารถพักออเด้อ takeout
- **ส่งครัวแล้วก็ Hold ได้** - ยืดหยุ่นมากขึ้น
- **Resume ได้ปกติ** - ไม่มีปัญหา

### 3. Mobile Friendly
- **Full screen** - ใช้พื้นที่เต็มที่
- **No overlay** - ไม่มีปัญหา scroll
- **Touch friendly** - ปุ่มใหญ่กดง่าย

## Testing Checklist

- [x] เข้าหน้า POS → แสดงหน้าเลือกโต๊ะเต็มหน้าจอ
- [x] ไม่มีปุ่ม X เมื่อยังไม่เลือก
- [x] เลือกโต๊ะ → แสดงหน้าเมนู
- [x] เลือก Takeout → แสดงหน้าเมนู
- [x] กดปุ่ม "กลับไปเลือก" → แสดงหน้าเลือกโต๊ะ (มีปุ่ม X)
- [x] Takeout สามารถ Hold Order ได้
- [x] Hold Order เมื่อส่งครัวแล้ว → บันทึกได้
- [x] Hold Order เมื่อยังไม่ส่งครัว → บันทึกได้
- [x] Resume Order → โหลดกลับมาได้
- [x] No diagnostics errors

## Related Features

- **V6**: Auto-show table selection, hide menu until selection
- **V5**: Separate cart per table/takeout
- **V4**: Merge/Split tables
- **V3**: Separate Dine-In and Takeout tabs
- **V2**: Allow re-entering occupied tables
- **V1**: Initial table selection system

## Version History

- **V7** (2026-05-07): Full page table selection, Takeout hold order support
- **V6**: Auto-show table selection, hide menu until selection
- **V5**: Separate cart per table/takeout with savedCarts
- **V4**: Merge/Split tables system
- **V3**: Separate Dine-In and Takeout tabs
- **V2**: Allow re-entering occupied tables
- **V1**: Initial table selection system

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
