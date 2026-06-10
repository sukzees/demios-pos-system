# Takeout Hold Order Fix

## Problem
Takeout ไม่สามารถบันทึก Hold Order ได้

## Root Cause
1. **savedCarts ไม่ถูกลบ**: เมื่อ Hold Order, savedCart ของ takeout ยังคงอยู่ ทำให้เมื่อเลือก takeout ใหม่จะโหลด cart เก่ากลับมา
2. **ไม่มี UI แสดง Held Orders**: ไม่มีส่วนแสดงรายการ Held Orders และปุ่ม Resume

## Solution

### 1. Fix holdOrder Function - ลบ savedCart

#### Before:
```typescript
holdOrder: async (note) => {
  const { cart, heldOrders, currentTable, currentOrderType } = get();
  
  set({
    heldOrders: [...heldOrders, newHeldOrder],
    cart: [],
    currentTable: null,
    currentOrderType: null
  });
}
```

#### After:
```typescript
holdOrder: async (note) => {
  const { cart, heldOrders, currentTable, currentOrderType, savedCarts } = get();
  
  // ลบ savedCart ของโต๊ะ/orderType ปัจจุบัน
  if (currentTable || currentOrderType) {
    const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
    delete savedCarts[currentKey];
  }
  
  set({
    heldOrders: [...heldOrders, newHeldOrder],
    cart: [],
    currentTable: null,
    currentOrderType: null,
    savedCarts: { ...savedCarts }  // อัพเดท savedCarts
  });
}
```

### 2. Add Held Orders UI

#### เพิ่มปุ่ม Held Orders ใน Cart Sidebar:

```typescript
{heldOrders.length > 0 && (
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => {
      // Toggle held orders modal
      const modal = document.getElementById('held-orders-modal');
      if (modal) {
        modal.classList.toggle('hidden');
      }
    }} 
    title={t.heldOrders}
    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 relative"
  >
    <PlayCircle className="h-5 w-5" />
    <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
      {heldOrders.length}
    </span>
  </Button>
)}
```

#### เพิ่ม Held Orders Modal:

```typescript
<div id="held-orders-modal" className="hidden absolute inset-0 bg-white z-50 flex flex-col">
  <div className="flex items-center justify-between border-b border-zinc-200 p-4 bg-purple-50">
    <h2 className="text-lg font-semibold text-purple-900">{t.heldOrders}</h2>
    <Button onClick={() => closeModal()}>
      <X className="h-5 w-5" />
    </Button>
  </div>
  
  <div className="flex-1 overflow-y-auto p-4">
    {heldOrders.map((order) => (
      <Card key={order.id}>
        <CardContent>
          {/* Order details */}
          <Button onClick={() => handleResumeOrder(order.id)}>
            <PlayCircle /> {t.resume}
          </Button>
          <Button onClick={() => removeHeldOrder(order.id)}>
            <Trash2 />
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
```

## Features

### 1. Hold Order for Takeout ✅
- **Takeout สามารถ Hold Order ได้**: บันทึกเมนูทั้งหมด (ส่งครัวแล้วหรือยัง)
- **ลบ savedCart**: ป้องกันการโหลด cart เก่ากลับมา
- **บันทึก orderType**: ระบุว่าเป็น takeout

### 2. Held Orders UI ✅
- **ปุ่ม Held Orders**: แสดงจำนวน held orders ด้วย badge
- **Modal แสดงรายการ**: แสดง held orders ทั้งหมด
- **แสดงข้อมูล**:
  - Order Type (Takeout/Table)
  - วันเวลา
  - หมายเหตุ
  - รายการเมนู (แสดง 3 รายการแรก)
  - ราคารวม
- **ปุ่ม Resume**: โหลดออเด้อกลับมา
- **ปุ่ม Delete**: ลบออเด้อ

### 3. Resume Order ✅
- **โหลด cart**: โหลดเมนูทั้งหมดกลับมา
- **โหลด table/orderType**: กลับไปโต๊ะ/takeout เดิม
- **โหลด note**: โหลดหมายเหตุกลับมา
- **ปิด modal**: ปิด held orders modal อัตโนมัติ

## User Flow

### Hold Order (Takeout):
1. **เลือก Takeout** → เพิ่มเมนู
2. **ส่งไปครัว** (หรือไม่ส่งก็ได้)
3. **กดปุ่ม Hold Order** (ไอคอน Pause)
4. **บันทึกสำเร็จ** → cart ว่าง, savedCart ถูกลบ
5. **ปุ่ม Held Orders ปรากฏ** → แสดง badge จำนวน

### Resume Order:
1. **กดปุ่ม Held Orders** (ไอคอน Play)
2. **เลือกออเด้อ** → แสดงรายละเอียด
3. **กดปุ่ม Resume**
4. **โหลดออเด้อ** → กลับไปหน้า POS พร้อมเมนู

### Delete Held Order:
1. **กดปุ่ม Held Orders**
2. **กดปุ่ม Delete** (ไอคอน Trash)
3. **ยืนยัน** → ลบออเด้อ

## Technical Details

### Files Modified:

#### 1. lib/store.ts
**Changes:**
- ✅ เพิ่ม `savedCarts` ใน `holdOrder` function
- ✅ ลบ savedCart เมื่อ Hold Order
- ✅ อัพเดท state `savedCarts`

**Code:**
```typescript
// ลบ savedCart ของโต๊ะ/orderType ปัจจุบัน
if (currentTable || currentOrderType) {
  const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
  delete savedCarts[currentKey];
}

set({
  heldOrders: [...heldOrders, newHeldOrder],
  cart: [],
  currentTable: null,
  currentOrderType: null,
  savedCarts: { ...savedCarts }
});
```

#### 2. app/pos/page.tsx
**Changes:**
- ✅ เพิ่มปุ่ม Held Orders ใน Cart Sidebar header
- ✅ เพิ่ม Held Orders Modal
- ✅ แสดงรายการ held orders
- ✅ เพิ่มปุ่ม Resume และ Delete
- ✅ Import X icon จาก lucide-react
- ✅ เปลี่ยน ShoppingCart เป็น ShoppingBag (fix conflict)

**UI Components:**
- **Held Orders Button**: ปุ่มสีม่วงพร้อม badge
- **Held Orders Modal**: Modal เต็มหน้าจอ
- **Order Card**: แสดงข้อมูลออเด้อ
- **Resume Button**: ปุ่มสีม่วง
- **Delete Button**: ปุ่มสีแดง

### State Management:

```typescript
// Hold Order
holdOrder(note) → {
  1. สร้าง newHeldOrder
  2. ลบ savedCart[key]
  3. เพิ่มใน heldOrders
  4. ล้าง cart
  5. ล้าง currentTable/currentOrderType
}

// Resume Order
resumeOrder(orderId) → {
  1. หา order จาก heldOrders
  2. โหลด cart
  3. โหลด table/orderType
  4. โหลด note
  5. ลบจาก heldOrders
}
```

## Benefits

### 1. Takeout Flexibility ✅
- **Hold Order ได้**: สามารถพักออเด้อ takeout
- **ส่งครัวแล้วก็ Hold ได้**: ยืดหยุ่นมากขึ้น
- **Resume ได้ปกติ**: ไม่มีปัญหา

### 2. Better UX ✅
- **เห็นรายการ Held Orders**: แสดงจำนวนด้วย badge
- **Resume ง่าย**: กดปุ่มเดียว
- **ลบได้**: สามารถลบออเด้อที่ไม่ต้องการ

### 3. Data Integrity ✅
- **ลบ savedCart**: ป้องกันการโหลด cart เก่า
- **บันทึก orderType**: ระบุประเภทออเด้อ
- **บันทึก table**: ระบุโต๊ะ (สำหรับ dine-in)

## Testing Checklist

- [x] Takeout สามารถ Hold Order ได้
- [x] Hold Order เมื่อส่งครัวแล้ว → บันทึกได้
- [x] Hold Order เมื่อยังไม่ส่งครัว → บันทึกได้
- [x] savedCart ถูกลบเมื่อ Hold Order
- [x] ปุ่ม Held Orders แสดงเมื่อมี held orders
- [x] Badge แสดงจำนวน held orders
- [x] Modal แสดงรายการ held orders
- [x] Resume Order → โหลดกลับมาได้
- [x] Delete Held Order → ลบได้
- [x] Dine-in Hold Order → ทำงานปกติ
- [x] No diagnostics errors

## Related Features

- **Hold Order**: พักออเด้อชั่วคราว
- **Resume Order**: โหลดออเด้อกลับมา
- **Separate Cart**: แยก cart ตามโต๊ะ/takeout
- **Send to Kitchen**: ส่งเมนูไปครัว

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
