# Kitchen Bill & Void Bill Settings - Complete

## สรุปการเปลี่ยนแปลง

เปลี่ยนเมนู "Void Bill" ใน Settings เป็น "Kitchen Bill & Void Bill" และเพิ่มการตั้งค่าขนาดกระดาษแยกสำหรับ Kitchen Bill และ Void Bill

## ไฟล์ที่แก้ไข

### 1. `lib/store.ts`

#### Type Definition
เพิ่มฟิลด์ใหม่ใน `receiptSettings`:
```typescript
receiptSettings: {
  // ... existing fields
  kitchenBillSize?: '58mm' | '80mm';  // ใหม่
  voidBillSize?: '58mm' | '80mm';     // ใหม่
}
```

#### Update Function
อัปเดต `updateReceiptSettings` เพื่อรองรับฟิลด์ใหม่

#### Default Values
```typescript
receiptSettings: {
  // ... existing fields
  kitchenBillSize: '80mm',  // ค่าเริ่มต้น
  voidBillSize: '80mm'      // ค่าเริ่มต้น
}
```

### 2. `app/settings/page.tsx`

#### Translations
เพิ่มคำแปลใหม่ทั้ง 3 ภาษา (EN, LO, TH):
- `kitchenBillAndVoidBill`: ชื่อเมนูใหม่
- `kitchenBillSettings`: หัวข้อการตั้งค่าบิลครัว
- `voidBillSettings`: หัวข้อการตั้งค่าบิลยกเลิก
- `kitchenBillSize`: ขนาดกระดาษบิลครัว
- `voidBillSize`: ขนาดกระดาษบิลยกเลิก

#### State Variables
เพิ่ม state ใหม่:
```typescript
const [kitchenBillSize, setKitchenBillSize] = useState(receiptSettings.kitchenBillSize || '80mm');
const [voidBillSize, setVoidBillSize] = useState(receiptSettings.voidBillSize || '80mm');
```

#### UI Changes
**Tab Name**: เปลี่ยนจาก "Void Bill" เป็น "Kitchen Bill & Void Bill"

**Layout**: แบ่งเป็น 2 sections:

1. **Kitchen Bill Settings Section**
   - Dropdown เลือกขนาดกระดาษ (58mm / 80mm)
   - แสดงจำนวนตัวอักษรต่อบรรทัด
   - Preview ตัวอย่างบิลครัว (ขนาดเปลี่ยนตามที่เลือก)

2. **Void Bill Settings Section**
   - Toggle เปิด/ปิด Void Bill
   - Toggle Auto-print
   - Dropdown เลือกขนาดกระดาษ (58mm / 80mm)
   - Dropdown เลือกเครื่องพิมพ์
   - Preview ตัวอย่างบิลยกเลิก (ขนาดเปลี่ยนตามที่เลือก)

#### Save Function
อัปเดต `handleSaveReceiptSettings` เพื่อบันทึกค่าใหม่:
```typescript
updateReceiptSettings({
  // ... existing fields
  kitchenBillSize: kitchenBillSize as '58mm' | '80mm',
  voidBillSize: voidBillSize as '58mm' | '80mm'
});
```

### 3. `app/pos/page.tsx`

#### Kitchen Ticket Content
อัปเดต `createKitchenTicketContent` เพื่อใช้ขนาดจาก settings:
```typescript
const paperSize = receiptSettings.kitchenBillSize || '80mm';
const separator = paperSize === '80mm' 
  ? '================================================' // 48 chars
  : '================================'; // 32 chars
```

#### Cancel Ticket Content
อัปเดต `createCancelTicketContent` เพื่อใช้ขนาดจาก settings:
```typescript
const paperSize = receiptSettings.voidBillSize || '80mm';
const separator = paperSize === '80mm' 
  ? '================================================' // 48 chars
  : '================================'; // 32 chars
```

#### API Calls
ส่งค่า `paperWidth` ไปยัง API:
```typescript
// Kitchen ticket
paperWidth: receiptSettings.kitchenBillSize || '80mm'

// Cancel ticket
paperWidth: receiptSettings.voidBillSize || '80mm'
```

## การใช้งาน

### ขั้นตอนการตั้งค่า

1. **เข้าสู่หน้า Settings**
   - คลิกเมนู "Settings"
   - เลือกแท็บ "Kitchen Bill & Void Bill"

2. **ตั้งค่า Kitchen Bill**
   - เลือกขนาดกระดาษ: 58mm หรือ 80mm
   - ดูตัวอย่างด้านขวา
   - 58mm = 32 ตัวอักษรต่อบรรทัด
   - 80mm = 48 ตัวอักษรต่อบรรทัด

3. **ตั้งค่า Void Bill**
   - เปิด/ปิด Void Bill
   - เลือกขนาดกระดาษ: 58mm หรือ 80mm
   - เลือกเครื่องพิมพ์ (ถ้าต้องการ)
   - เปิด/ปิด Auto-print

4. **บันทึกการตั้งค่า**
   - คลิกปุ่ม "Save"

### ผลลัพธ์

- **Kitchen Bill**: พิมพ์ตามขนาดที่ตั้งค่า
- **Void Bill**: พิมพ์ตามขนาดที่ตั้งค่า
- ขนาดกระดาษแยกกันได้ (Kitchen อาจเป็น 80mm, Void อาจเป็น 58mm)

## ขนาดกระดาษที่รองรับ

### 58mm Paper
- **ความกว้าง**: 32 ตัวอักษร
- **เส้นแบ่ง**: `================================`
- **เหมาะสำหรับ**: เครื่องพิมพ์ขนาดเล็ก, ประหยัดกระดาษ

### 80mm Paper
- **ความกว้าง**: 48 ตัวอักษร
- **เส้นแบ่ง**: `================================================`
- **เหมาะสำหรับ**: เครื่องพิมพ์มาตรฐาน, อ่านง่าย, แสดงข้อมูลได้มากกว่า

## ตัวอย่างการแสดงผล

### Kitchen Bill (80mm)
```
================================================
*** Kitchen ***
================================================

Table: T1
Time: 11/05/2026, 10:30:00

================================================

2x  Pad Thai
    Size: Large
    Note: Extra spicy

1x  Tom Yum Soup

================================================

ORDER NOTE:
No peanuts please

================================================

Restaurant Name

```

### Kitchen Bill (58mm)
```
================================
*** Kitchen ***
================================

Table: T1
Time: 11/05/2026, 10:30:00

================================

2x  Pad Thai
    Size: Large

1x  Tom Yum Soup

================================

Restaurant Name

```

### Void Bill (80mm)
```
================================================
*** CANCEL ORDER ***
================================================

Table: T1
Time: 11/05/2026, 10:35:00

================================================

CANCELLED ITEM:

1x  Pad Thai
    Size: Large

================================================

Please discard this item

================================================

Restaurant Name

```

### Void Bill (58mm)
```
================================
*** CANCEL ORDER ***
================================

Table: T1
Time: 11/05/2026, 10:35:00

================================

CANCELLED ITEM:

1x  Pad Thai
    Size: Large

================================

Please discard this item

================================

Restaurant Name

```

## ข้อดีของการแยกการตั้งค่า

1. **ความยืดหยุ่น**: เลือกขนาดแยกกันได้ตามความเหมาะสม
2. **ประหยัด**: ใช้กระดาษ 58mm สำหรับ Void Bill ที่ไม่ต้องการข้อมูลมาก
3. **ชัดเจน**: ใช้กระดาษ 80mm สำหรับ Kitchen Bill ที่ต้องการอ่านง่าย
4. **ปรับแต่งได้**: แต่ละร้านเลือกได้ตามเครื่องพิมพ์ที่มี

## การทดสอบ

### ขั้นตอนการทดสอบ

1. **ทดสอบ Kitchen Bill**
   - ตั้งค่าเป็น 58mm → ส่งไปครัว → ตรวจสอบความกว้าง
   - ตั้งค่าเป็น 80mm → ส่งไปครัว → ตรวจสอบความกว้าง

2. **ทดสอบ Void Bill**
   - ตั้งค่าเป็น 58mm → ยกเลิกเมนู → ตรวจสอบความกว้าง
   - ตั้งค่าเป็น 80mm → ยกเลิกเมนู → ตรวจสอบความกว้าง

3. **ทดสอบการผสม**
   - Kitchen = 80mm, Void = 58mm
   - Kitchen = 58mm, Void = 80mm

### สิ่งที่ต้องตรวจสอบ

- ✅ เส้นแบ่งยาวถูกต้องตามขนาดกระดาษ
- ✅ ข้อความไม่ล้นออกนอกกระดาษ
- ✅ Preview ในหน้า Settings แสดงขนาดถูกต้อง
- ✅ บันทึกการตั้งค่าสำเร็จ
- ✅ พิมพ์ออกมาตรงตามที่ตั้งค่า

## หมายเหตุ

- ค่าเริ่มต้นทั้งคู่เป็น 80mm
- สามารถเปลี่ยนได้ทุกเวลาในหน้า Settings
- การเปลี่ยนแปลงมีผลทันทีหลังจากบันทึก
- ไม่กระทบกับการตั้งค่าเครื่องพิมพ์
- แต่ละประเภทบิลใช้ขนาดแยกกัน

## การแก้ไขปัญหา

### ข้อความล้นออกนอกกระดาษ
- ตรวจสอบว่าเลือกขนาดกระดาษถูกต้อง
- ถ้าใช้กระดาษ 58mm ต้องตั้งค่าเป็น 58mm
- ถ้าใช้กระดาษ 80mm ต้องตั้งค่าเป็น 80mm

### เส้นแบ่งไม่เต็มกระดาษ
- 58mm: เส้นแบ่งยาว 32 ตัวอักษร
- 80mm: เส้นแบ่งยาว 48 ตัวอักษร
- ตรวจสอบการตั้งค่าในหน้า Settings

### การตั้งค่าไม่บันทึก
- ตรวจสอบว่ากดปุ่ม "Save" แล้ว
- รีเฟรชหน้าเว็บ
- ตรวจสอบ console สำหรับ error
