# Receipt Multi-language & Font Fix

## Problem
1. QR Code ไม่ชัดพอที่จะ scan ได้
2. บางส่วนของใบบิลยังไม่ใช้ font Noto Sans Lao
3. หลายข้อความในใบบิลยังเป็นภาษาอังกฤษ ไม่แปลตามภาษาที่เลือก

## Solutions Applied

### 1. ปรับปรุง QR Code
```typescript
// เพิ่มขนาด QR Code
width: 220px; height: 220px; (จาก 140px)

// เพิ่ม White Border และกรอบดำ
background: white; 
padding: 10px; 
border: 2px solid #000;

// ปรับ Image Rendering ให้คมชัด
image-rendering: -webkit-optimize-contrast;
image-rendering: crisp-edges;
image-rendering: pixelated;
```

### 2. แก้ไข Font Noto Sans Lao ให้ครอบคลุมทุกส่วน
```css
* { font-family: 'Noto Sans Lao', sans-serif; }
table { font-family: 'Noto Sans Lao', sans-serif; }
th, td { font-family: 'Noto Sans Lao', sans-serif; }
h1, h2, h3, h4, h5, h6, p, div, span { font-family: 'Noto Sans Lao', sans-serif; }
```

### 3. เพิ่มคำแปลใน TRANSLATIONS

**คำแปลที่เพิ่ม:**
- `notes` - หมายเหตุ (lo: ໝາຍເຫດ, th: หมายเหตุ)
- `date` - วันที่ (lo: ວັນທີ, th: วันที่)
- `unit` - จำนวน (lo: ຈຳນວນ, th: จำนวน)
- `price` - ราคา (lo: ລາຄາ, th: ราคา)
- `bankTransferDetails` - รายละเอียดโอนเงิน (lo: ລາຍລະອຽດໂອນເງິນ, th: รายละเอียดโอนเงิน)
- `scanToPay` - สแกนเพื่อจ่าย (lo: ສະແກນເພື່ອຈ່າຍ, th: สแกนเพื่อจ่าย)

### 4. แก้ไขใบบิลให้ใช้คำแปล

**ก่อน:**
```typescript
'<span>Payment Method</span>'
'<span>Cash Tendered</span>'
'<span>Change</span>'
'<th>Item</th>'
'<th>Unit</th>'
'<th>Price</th>'
'Bank Transfer Details'
'Scan to Pay'
```

**หลัง:**
```typescript
'<span>' + t.paymentMethod + '</span>'
'<span>' + t.cashTendered + '</span>'
'<span>' + t.change + '</span>'
'<th>' + t.item + '</th>'
'<th>' + t.unit + '</th>'
'<th>' + t.price + '</th>'
t.bankTransferDetails
t.scanToPay
```

### 5. QR Code แสดงทุกใบบิล
```typescript
// ไม่มีเงื่อนไข activeTab === 'transfer' แล้ว
const bankForDisplay = selectedTransferBank || transferBanks.find(b => b.enabledForTransfer);
```

## ผลลัพธ์

### ใบบิลภาษาลาว (lo):
```
ວັນທີ: [date]
ໂຕະ: [table_number]

ລາຍການ    ຈຳນວນ    ລາຄາ    ລວມທັງໝົດ
----------------------------------------
ລາຄາລວມ:              [subtotal]
ສ່ວນຫຼຸດ:             -[discount]
ອາກອນ (10%):          [tax]
ທິບ:                  [tip]
ເລືອກວິທີຊຳລະ:        ເງິນສົດ/ໂອນເງິນ
ເງິນທີ່ຮັບ:           [tendered]
ທອນ:                  [change]

ລວມທັງໝົດ: [total]

ລາຍລະອຽດໂອນເງິນ
ທະນາຄານ: [bank_name]
ຊື່ບັນຊີ: [account_name]
ເລກບັນຊີ: [account_number]

ສະແກນເພື່ອຈ່າຍ
[QR Code 220x220px]
```

### ใบบิลภาษาไทย (th):
```
วันที่: [date]
โต๊ะ: [table_number]

รายการ    จำนวน    ราคา    รวมทั้งสิ้น
----------------------------------------
ราคารวม:              [subtotal]
ส่วนลด:               -[discount]
ภาษี (10%):           [tax]
ทิป:                  [tip]
เลือกวิธีชำระเงิน:     เงินสด/โอนเงิน
เงินที่รับ:           [tendered]
ทอน:                  [change]

รวมทั้งสิ้น: [total]

รายละเอียดโอนเงิน
ธนาคาร: [bank_name]
ชื่อบัญชี: [account_name]
เลขที่บัญชี: [account_number]

สแกนเพื่อจ่าย
[QR Code 220x220px]
```

## Benefits

1. ✅ **QR Code ชัด scan ได้ง่าย** - ขนาดใหญ่ขึ้น + image rendering คมชัด
2. ✅ **Font สวยงาม** - Noto Sans Lao ครอบคลุมทุกส่วน
3. ✅ **Multi-language ครบ** - ทุกข้อความแปลตามภาษาที่เลือก
4. ✅ **แสดง QR ทุกใบบิล** - ไม่ว่าจะ Cash หรือ Transfer

## Files Modified
- `app/pos/page.tsx` - แก้ไข handlePrintBill function, เพิ่มคำแปล, ปรับ CSS
