# Takeout Page Redesign

## Overview
ปรับปรุงหน้า Takeout ใน TableSelection component:
1. เปลี่ยนปุ่ม "Takeout" เป็น "Add New" และย้ายไปด้านบน
2. แสดงรายการ Held Orders ที่เป็น takeout ทั้งหมด

## Implementation Status: ✅ COMPLETE

## Key Changes

### 1. New Takeout Page Layout

#### Before:
```
┌─────────────────────────┐
│                         │
│    [Takeout Icon]       │
│                         │
│      Takeout            │
│   For pickup            │
│                         │
│   [Takeout Button]      │
│                         │
└─────────────────────────┘
```

#### After:
```
┌─────────────────────────┐
│  [+ Add New] (ด้านบน)   │
├─────────────────────────┤
│ Held Takeout Orders     │
├─────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐│
│ │Order│ │Order│ │Order││
│ │  1  │ │  2  │ │  3  ││
│ └─────┘ └─────┘ └─────┘│
│ ┌─────┐ ┌─────┐         │
│ │Order│ │Order│         │
│ │  4  │ │  5  │         │
│ └─────┘ └─────┘         │
└─────────────────────────┘
```

### 2. Add New Button

**Location**: ด้านบนสุดของหน้า Takeout

**Design:**
- ปุ่มเต็มความกว้าง
- สูง 16 (h-16)
- สีเขียว (bg-green-600)
- ไอคอน Plus (+)
- ข้อความ "Add New" / "เพิ่มใหม่"

```typescript
<Button
  onClick={handleTakeout}
  className="w-full h-16 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg rounded-xl"
>
  <Plus className="mr-3 h-6 w-6" />
  {t.addNew}
</Button>
```

### 3. Held Takeout Orders Display

**Filter**: แสดงเฉพาะ held orders ที่ `orderType === 'takeout'`

```typescript
const takeoutHeldOrders = heldOrders.filter(order => order.orderType === 'takeout');
```

**Layout**: Grid 3 columns (responsive)
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

**Order Card Design:**
- Border สีเขียว (border-green-200)
- Header สีเขียวอ่อน (bg-green-50)
- Hover effect (shadow-lg)
- Click to resume

**Card Content:**
- ไอคอน ShoppingBag + "Takeout"
- วันเวลา (Clock icon)
- หมายเหตุ (ถ้ามี)
- รายการเมนู 3 รายการแรก
- จำนวนเมนูที่เหลือ (ถ้ามี)
- ราคารวม (สีเขียว)
- ปุ่ม Resume

### 4. Empty State

**When**: ไม่มี held takeout orders

**Display:**
- ไอคอน ShoppingBag ขนาดใหญ่ (opacity 20%)
- ข้อความ "No held takeout orders"
- ความสูง 64 (h-64)

```typescript
{takeoutHeldOrders.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
    <ShoppingBag className="h-16 w-16 opacity-20 mb-4" />
    <p className="text-lg">{t.noHeldTakeout}</p>
  </div>
) : (
  // Display orders
)}
```

## User Flow

### Add New Takeout Order:
1. **เข้าหน้า Takeout** → เห็นปุ่ม "Add New" ด้านบน
2. **กดปุ่ม "Add New"** → ไปหน้าเมนู
3. **เพิ่มเมนู** → เลือกสินค้า
4. **Hold Order** → บันทึกเป็น held order

### Resume Takeout Order:
1. **เข้าหน้า Takeout** → เห็นรายการ held orders
2. **คลิกที่ Order Card** → Resume order
3. **หรือกดปุ่ม Resume** → Resume order
4. **ไปหน้าเมนู** → แสดงเมนูที่บันทึกไว้

### View Held Orders:
1. **เข้าหน้า Takeout** → เห็นรายการทั้งหมด
2. **ดูรายละเอียด**:
   - วันเวลา
   - หมายเหตุ
   - รายการเมนู
   - ราคารวม

## Technical Details

### Files Modified:

#### 1. components/table-selection.tsx

**Changes:**
- ✅ Import icons: `Plus`, `PlayCircle`, `Clock`
- ✅ Import `resumeOrder` from store
- ✅ Add `onResumeOrder` prop
- ✅ Filter takeout held orders
- ✅ Redesign Takeout tab content
- ✅ Add "Add New" button at top
- ✅ Display held orders in grid
- ✅ Add order cards with details
- ✅ Add empty state

**New Props:**
```typescript
interface TableSelectionProps {
  onSelectTable: (table: Table | null, orderType: 'dine-in' | 'takeout') => void;
  onClose: () => void;
  canClose?: boolean;
  onResumeOrder?: (orderId: string) => void; // ใหม่
}
```

**State:**
```typescript
const { generalSettings, heldOrders, resumeOrder } = usePosStore();
const takeoutHeldOrders = heldOrders.filter(order => order.orderType === 'takeout');
```

#### 2. app/pos/page.tsx

**Changes:**
- ✅ Pass `onResumeOrder={handleResumeOrder}` to TableSelection
- ✅ Both instances (initial and change table)

**Code:**
```typescript
<TableSelection
  onSelectTable={handleTableSelect}
  onClose={() => {}}
  canClose={false}
  onResumeOrder={handleResumeOrder}  // ✓ เพิ่ม
/>
```

### Translations Added:

**English:**
- `addNew`: "Add New"
- `heldTakeoutOrders`: "Held Takeout Orders"
- `noHeldTakeout`: "No held takeout orders"
- `resume`: "Resume"
- `items`: "items"

**Lao:**
- `addNew`: "ເພີ່ມໃໝ່"
- `heldTakeoutOrders`: "ລາຍການກັບບ້ານທີ່ພັກໄວ້"
- `noHeldTakeout`: "ບໍ່ມີລາຍການກັບບ້ານທີ່ພັກໄວ້"
- `resume`: "ສືບຕໍ່"
- `items`: "ລາຍການ"

**Thai:**
- `addNew`: "เพิ่มใหม่"
- `heldTakeoutOrders`: "รายการกลับบ้านที่พักไว้"
- `noHeldTakeout`: "ไม่มีรายการกลับบ้านที่พักไว้"
- `resume`: "ดำเนินการต่อ"
- `items`: "รายการ"

### Order Card Structure:

```typescript
<Card className="border-green-200 hover:border-green-300">
  <CardHeader className="bg-green-50">
    <ShoppingBag /> Takeout
    <PlayCircle />
  </CardHeader>
  <CardContent>
    {/* Date/Time */}
    <Clock /> {date}
    
    {/* Note */}
    {note && <div>"{note}"</div>}
    
    {/* Items Preview */}
    {cart.slice(0, 3).map(item => (
      <div>{item.quantity}x {item.name} - {price}</div>
    ))}
    {cart.length > 3 && <div>+{remaining} items</div>}
    
    {/* Total */}
    <div>Total: {totalAmount}</div>
    
    {/* Resume Button */}
    <Button onClick={resumeOrder}>
      <PlayCircle /> Resume
    </Button>
  </CardContent>
</Card>
```

## Benefits

### 1. Better UX ✅
- **ชัดเจนขึ้น**: เห็นรายการ held orders ทั้งหมด
- **เข้าถึงง่าย**: คลิกที่ card เพื่อ resume
- **Add New ชัดเจน**: ปุ่มด้านบนเด่นชัด

### 2. Efficient Workflow ✅
- **เห็นภาพรวม**: ดูรายการทั้งหมดในหน้าเดียว
- **Resume เร็ว**: คลิกเดียวโหลดออเด้อ
- **จัดการง่าย**: เห็นรายละเอียดทุกออเด้อ

### 3. Visual Design ✅
- **Grid Layout**: แสดงหลายออเด้อพร้อมกัน
- **Color Coding**: สีเขียวสำหรับ takeout
- **Responsive**: ปรับตามขนาดหน้าจอ

## Testing Checklist

- [x] ปุ่ม "Add New" แสดงด้านบน
- [x] กดปุ่ม "Add New" → ไปหน้าเมนู
- [x] แสดง held takeout orders ทั้งหมด
- [x] Filter เฉพาะ orderType === 'takeout'
- [x] Order card แสดงข้อมูลครบถ้วน
- [x] คลิก card → resume order
- [x] กดปุ่ม Resume → resume order
- [x] Empty state แสดงเมื่อไม่มี orders
- [x] Grid responsive (1/2/3 columns)
- [x] Translations ครบ 3 ภาษา
- [x] No diagnostics errors

## Related Features

- **Hold Order**: พักออเด้อ takeout
- **Resume Order**: โหลดออเด้อกลับมา
- **Table Selection**: เลือกโต๊ะ/takeout
- **Separate Cart**: แยก cart ตามโต๊ะ/takeout

---

**Status**: ✅ Implementation Complete and Verified
**Last Updated**: 2026-05-07
