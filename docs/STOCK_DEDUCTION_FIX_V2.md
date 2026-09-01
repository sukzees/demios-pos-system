# Stock Deduction Fix V2 - แก้ปัญหาหัก Stock ซ้ำ

## ปัญหาที่พบ
Stock ถูกหักซ้ำ 2 ครั้ง:
1. **ครั้งที่ 1**: เมื่อเพิ่มสินค้าเข้า cart (ใน `addToCart`)
2. **ครั้งที่ 2**: เมื่อกด Confirm Payment (ใน `checkout`)

## สาเหตุ
ระบบเดิมหัก stock ทันทีเมื่อเพิ่มสินค้าเข้า cart และอัปเดตทั้งใน local state และ database ทำให้เมื่อ checkout จะหักอีกครั้ง

## วิธีแก้ไข

### 1. แก้ไข `addToCart` - ไม่หัก Stock
**ก่อนแก้:**
- หัก stock ทันทีเมื่อเพิ่มเข้า cart
- อัปเดต database ทันที
- อัปเดต local state

**หลังแก้:**
- **เช็คว่ามี stock พอหรือไม่** (validation only)
- **เพิ่มเข้า cart โดยไม่หัก stock**
- Stock จะถูกหักเฉพาะตอน checkout เท่านั้น

```typescript
// ตอนนี้แค่ validate stock
if (currentQty + addQty > currentStock) {
  alert(`Not enough stock for ${item.name}. Available: ${currentStock}`);
  return;
}

// เพิ่มเข้า cart โดยไม่หัก stock
set({
  cart: [...cart, {
    item,
    quantity: addQty,
    sourceItemId: sourceId,
    portionName: options?.portionName,
    portionId: portionId,
    sentToKitchen: false,
    completedInKitchen: false
  }]
});
```

### 2. แก้ไข `removeFromCartByIndex` - ไม่คืน Stock
**ก่อนแก้:**
- คืน stock เมื่อลบออกจาก cart
- อัปเดต database

**หลังแก้:**
- **แค่ลบออกจาก cart**
- ไม่คืน stock เพราะไม่เคยหักตั้งแต่แรก

### 3. แก้ไข `updateCartQuantityByIndex` - ไม่หัก/คืน Stock
**ก่อนแก้:**
- เพิ่มจำนวน → หัก stock
- ลดจำนวน → คืน stock
- อัปเดต database

**หลังแก้:**
- **เช็คว่ามี stock พอหรือไม่** (validation only)
- **อัปเดตจำนวนใน cart เท่านั้น**
- ไม่หัก/คืน stock

### 4. แก้ไข `cancelCartItemByIndex` - ไม่คืน Stock
**ก่อนแก้:**
- คืน stock เมื่อยกเลิกรายการ
- อัปเดต database

**หลังแก้:**
- **แค่ mark เป็น cancelled**
- ไม่คืน stock เพราะไม่เคยหักตั้งแต่แรก

### 5. `checkout` - หัก Stock เพียงครั้งเดียว
ฟังก์ชัน `checkout` ยังคงเหมือนเดิม:
- หัก stock จาก database
- หัก portion stock (ถ้ามี)
- หัก ingredient stock สำหรับ recipe
- บันทึก inventory transactions

## Flow การทำงานใหม่

### เมื่อเพิ่มสินค้าเข้า Cart:
1. ✅ เช็ค stock ว่าพอหรือไม่
2. ✅ เพิ่มเข้า cart
3. ❌ **ไม่หัก stock**

### เมื่อส่งไปครัว (Send to Kitchen):
1. ✅ Mark items as `sentToKitchen`
2. ✅ Print kitchen tickets
3. ❌ **ไม่หัก stock**

### เมื่อกด Confirm Payment:
1. ✅ Filter เฉพาะ active items (ไม่รวมที่ยกเลิก)
2. ✅ **หัก stock จาก database** (ครั้งเดียว)
3. ✅ สร้าง order
4. ✅ Release table
5. ✅ Clear cart

### เมื่อลบสินค้าออกจาก Cart:
1. ✅ ลบออกจาก cart
2. ❌ **ไม่คืน stock** (เพราะไม่เคยหัก)

### เมื่อยกเลิกรายการ (Cancel):
1. ✅ Mark เป็น `cancelled`
2. ❌ **ไม่คืน stock** (เพราะไม่เคยหัก)

## ข้อดีของวิธีใหม่

1. **Stock ถูกหักเพียงครั้งเดียว** - ตอน checkout เท่านั้น
2. **ไม่มีปัญหา race condition** - ไม่มีการอัปเดต stock หลายที่
3. **ง่ายต่อการ debug** - stock เปลี่ยนแปลงแค่จุดเดียว
4. **ตรงตามหลักการ** - stock ควรหักเมื่อขายจริง ไม่ใช่เมื่อเพิ่มเข้า cart

## การทดสอบ

### Test Case 1: เพิ่มสินค้าเข้า Cart
```
1. เพิ่มสินค้า A (stock = 10) จำนวน 2 เข้า cart
2. ตรวจสอบ: stock ยังคงเป็น 10 (ไม่เปลี่ยน)
3. ตรวจสอบ: cart มีสินค้า A จำนวน 2
```

### Test Case 2: ส่งไปครัว
```
1. เพิ่มสินค้า A จำนวน 2 เข้า cart
2. กด Send to Kitchen
3. ตรวจสอบ: stock ยังคงเป็น 10 (ไม่เปลี่ยน)
4. ตรวจสอบ: items marked as sentToKitchen
```

### Test Case 3: Confirm Payment
```
1. เพิ่มสินค้า A (stock = 10) จำนวน 2 เข้า cart
2. กด Confirm Payment
3. ตรวจสอบ: stock เปลี่ยนเป็น 8 (หักครั้งเดียว)
4. ตรวจสอบ console log: [CHECKOUT] Item X: 10 -> 8
```

### Test Case 4: ลบออกจาก Cart
```
1. เพิ่มสินค้า A (stock = 10) จำนวน 2 เข้า cart
2. ลบสินค้า A ออกจาก cart
3. ตรวจสอบ: stock ยังคงเป็น 10 (ไม่คืน)
```

### Test Case 5: ยกเลิกรายการ
```
1. เพิ่มสินค้า A (stock = 10) จำนวน 2 เข้า cart
2. ส่งไปครัว
3. ยกเลิกรายการ
4. ตรวจสอบ: stock ยังคงเป็น 10 (ไม่คืน)
5. กด Confirm Payment
6. ตรวจสอบ: stock ยังคงเป็น 10 (ไม่หัก เพราะยกเลิกแล้ว)
```

## Console Logs ที่ควรดู

เมื่อ checkout:
```
[CHECKOUT] Starting checkout...
[CHECKOUT] Active cart items: 2
[CHECKOUT] Clearing cart from UI...
[CHECKOUT] Deducting 2 from item abc-123
[CHECKOUT] Item abc-123: 10 -> 8
[CHECKOUT] Fetching updated items from database...
[CHECKOUT] Items refreshed successfully
```

## ไฟล์ที่แก้ไข

1. **lib/store.ts**
   - `addToCart` - ลบการหัก stock
   - `removeFromCartByIndex` - ลบการคืน stock
   - `updateCartQuantityByIndex` - ลบการหัก/คืน stock
   - `cancelCartItemByIndex` - ลบการคืน stock
   - `checkout` - ยังคงหัก stock เหมือนเดิม (แต่เพิ่ม logging)

2. **docs/STOCK_DEDUCTION_FIX_V2.md** - เอกสารนี้

## สรุป

การแก้ไขครั้งนี้เปลี่ยนแนวคิดจาก:
- ❌ **หัก stock ทันทีเมื่อเพิ่มเข้า cart** → คืนเมื่อลบ
- ✅ **หัก stock เฉพาะตอน checkout** → ไม่ต้องคืน

วิธีนี้ทำให้:
- Stock ถูกหักเพียงครั้งเดียว
- ไม่มีปัญหาหักซ้ำ
- ง่ายต่อการจัดการและ debug
