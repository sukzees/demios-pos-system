# Back to Selection - Save Cart Fix

## Problem
เมื่อกดปุ่ม "Back to Selection" ในหน้า Takeout (หรือ Dine-In) เมนูใน cart หายไป

## Root Cause
ปุ่ม "Back to Selection" เรียก `clearUnsentItems()` ซึ่งจะลบเมนูที่ยังไม่ส่งครัวทั้งหมด

```typescript
// Before (ผิด)
onClick={() => {
  clearUnsentItems();  // ❌ ลบเมนูที่ยังไม่ส่งครัว
  setShowTableSelection(true);
}}
```

## Solution

### 1. เปลี่ยนจาก `clearUnsentItems()` เป็น `clearCurrentTable()`

#### Before:
```typescript
onClick={() => {
  clearUnsentItems();  // ❌ ลบเมนูทิ้ง
  setShowTableSelection(true);
}}
```

#### After:
```typescript
onClick={() => {
  clearCurrentTable();  // ✓ บันทึก cart ก่อนล้าง
  setShowTableSelection(true);
}}
```

### 2. อัพเดท `clearCurrentTable()` ให้ล้าง cart ออกจากหน้าจอ

#### Before:
```typescript
clearCurrentTable: () => {
  const { cart, currentTable, currentOrderType, savedCarts } = get();
  
  // บันทึก cart ปัจจุบันก่อนล้าง
  if (currentTable || currentOrderType) {
    const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
    savedCarts[currentKey] = [...cart];
  }
  
  set({ 
    currentTable: null, 
    currentOrderType: null,
    savedCarts: { ...savedCarts }
  });
}
```

#### After:
```typescript
clearCurrentTable: () => {
  const { cart, currentTable, currentOrderType, savedCarts } = get();
  
  // บันทึก cart ปัจจุบันก่อนล้าง
  if (currentTable || currentOrderType) {
    const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
    savedCarts[currentKey] = [...cart];
  }
  
  set({ 
    cart: [],  // ✓ ล้าง cart ออกจากหน้าจอ
    currentTable: null, 
    currentOrderType: null,
    savedCarts: { ...savedCarts }
  });
}
```

## How It Works

### User Flow:

#### 1. เลือก Takeout และเพิ่มเมนู:
```
Takeout → Add items → Cart: [Burger, Fries]
savedCarts: { takeout: [Burger, Fries] }
```

#### 2. กดปุ่ม "Back to Selection":
```
clearCurrentTable() → {
  1. บันทึก cart ลง savedCarts['takeout']
  2. ล้าง cart ออกจากหน้าจอ
  3. ล้าง currentTable และ currentOrderType
}

Result:
- cart: [] (ว่าง)
- savedCarts: { takeout: [Burger, Fries] } (บันทึกไว้)
- currentTable: null
- currentOrderType: null
```

#### 3. เลือก Takeout อีกครั้ง:
```
setCurrentTable(null, 'takeout') → {
  1. โหลด cart จาก savedCarts['takeout']
  2. แสดงเมนูกลับมา
}

Result:
- cart: [Burger, Fries] (โหลดกลับมา)
- currentOrderType: 'takeout'
```

## Comparison

### clearUnsentItems() vs clearCurrentTable()

| Feature | clearUnsentItems() | clearCurrentTable() |
|---------|-------------------|---------------------|
| ลบเมนูที่ยังไม่ส่งครัว | ✓ ลบทิ้ง | ✗ บันทึกไว้ |
| เก็บเมนูที่ส่งครัวแล้ว | ✓ เก็บไว้ | ✗ บันทึกทั้งหมด |
| บันทึกลง savedCarts | ✗ ไม่บันทึก | ✓ บันทึก |
| ล้าง currentTable | ✗ ไม่ล้าง | ✓ ล้าง |
| ล้าง currentOrderType | ✗ ไม่ล้าง | ✓ ล้าง |
| ล้าง cart จากหน้าจอ | ✓ ล้าง | ✓ ล้าง |
| Use Case | เปลี่ยนโต๊ะ (เก็บเฉพาะที่ส่งครัว) | กลับไปเลือก (เก็บทั้งหมด) |

## Benefits

### 1. ไม่สูญเสียข้อมูล ✅
- **เมนูไม่หาย**: บันทึกไว้ใน savedCarts
- **กลับมาได้**: เลือก takeout/table เดิมจะโหลดกลับมา
- **ทำงานต่อได้**: ไม่ต้องเพิ่มเมนูใหม่

### 2. UX ดีขึ้น ✅
- **ไม่ต้องกังวล**: กดปุ่มผิดก็ไม่เสียข้อมูล
- **ยืดหยุ่น**: สามารถเปลี่ยนโต๊ะ/takeout ได้
- **ต่อเนื่อง**: ทำงานต่อจากที่ค้างไว้

### 3. Consistent Behavior ✅
- **เหมือนกับ setCurrentTable**: บันทึก cart ก่อนเปลี่ยน
- **เหมือนกับ Hold Order**: บันทึกข้อมูล
- **Predictable**: ผู้ใช้คาดเดาได้

## Technical Details

### Files Modified:

#### 1. app/pos/page.tsx
**Change**: เปลี่ยนจาก `clearUnsentItems()` เป็น `clearCurrentTable()`

**Location**: ปุ่ม "Back to Selection" ใน Table Info Bar

**Code:**
```typescript
<Button
  onClick={() => {
    clearCurrentTable();  // ✓ เปลี่ยนจาก clearUnsentItems()
    setShowTableSelection(true);
  }}
>
  <ArrowRight className="rotate-180" />
  {t.backToSelection}
</Button>
```

#### 2. lib/store.ts
**Change**: เพิ่ม `cart: []` ใน `clearCurrentTable()`

**Reason**: ล้าง cart ออกจากหน้าจอหลังบันทึกแล้ว

**Code:**
```typescript
clearCurrentTable: () => {
  const { cart, currentTable, currentOrderType, savedCarts } = get();
  
  // บันทึก cart ปัจจุบันก่อนล้าง
  if (currentTable || currentOrderType) {
    const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
    savedCarts[currentKey] = [...cart];
  }
  
  set({ 
    cart: [],  // ✓ เพิ่มบรรทัดนี้
    currentTable: null, 
    currentOrderType: null,
    savedCarts: { ...savedCarts }
  });
}
```

### State Flow:

```typescript
// Initial State
{
  cart: [Burger, Fries],
  currentOrderType: 'takeout',
  savedCarts: {}
}

// After clearCurrentTable()
{
  cart: [],  // ล้างออกจากหน้าจอ
  currentOrderType: null,
  savedCarts: {
    takeout: [Burger, Fries]  // บันทึกไว้
  }
}

// After setCurrentTable(null, 'takeout')
{
  cart: [Burger, Fries],  // โหลดกลับมา
  currentOrderType: 'takeout',
  savedCarts: {
    takeout: [Burger, Fries]
  }
}
```

## Testing Checklist

- [x] กดปุ่ม "Back to Selection" → cart บันทึกไว้
- [x] เลือก takeout/table เดิม → cart โหลดกลับมา
- [x] เมนูที่ส่งครัวแล้ว → บันทึกไว้
- [x] เมนูที่ยังไม่ส่งครัว → บันทึกไว้
- [x] cart ล้างออกจากหน้าจอ → ไม่แสดงเมนู
- [x] savedCarts อัพเดท → บันทึกถูกต้อง
- [x] currentTable ล้าง → null
- [x] currentOrderType ล้าง → null
- [x] No diagnostics errors

## Related Features

- **setCurrentTable**: บันทึก cart เมื่อเปลี่ยนโต๊ะ
- **clearCart**: ล้าง cart และ savedCart
- **Hold Order**: บันทึกออเด้อชั่วคราว
- **savedCarts**: เก็บ cart แยกตามโต๊ะ/takeout

## Use Cases

### Use Case 1: เปลี่ยนใจ
```
1. เลือก Takeout → เพิ่มเมนู
2. กดปุ่ม "Back to Selection"
3. เลือก Table 1 → เพิ่มเมนูใหม่
4. กดปุ่ม "Back to Selection"
5. เลือก Takeout → เมนูเดิมกลับมา ✓
```

### Use Case 2: ทำหลายออเด้อ
```
1. เลือก Takeout → เพิ่มเมนู A
2. กดปุ่ม "Back to Selection"
3. เลือก Table 1 → เพิ่มเมนู B
4. กดปุ่ม "Back to Selection"
5. เลือก Table 2 → เพิ่มเมนู C
6. กดปุ่ม "Back to Selection"
7. เลือก Takeout → เมนู A กลับมา ✓
```

### Use Case 3: ส่งครัวแล้ว
```
1. เลือก Takeout → เพิ่มเมนู
2. ส่งไปครัว
3. เพิ่มเมนูใหม่
4. กดปุ่ม "Back to Selection"
5. เลือก Takeout → เมนูทั้งหมดกลับมา ✓
```

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
