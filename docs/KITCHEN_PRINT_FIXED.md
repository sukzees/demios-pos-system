# ✅ แก้ไขปัญหาการพิมพ์ไปครัวสำเร็จ!

## 🎉 สถานะ: แก้ไขเสร็จแล้ว

แก้ไข JSON parsing error เมื่อกดปุ่ม "ส่งไปที่ครัว"

---

## 🐛 ปัญหาที่พบ

**Error Message:**
```
Failed to print to Kitchen Printer: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**สาเหตุ:**
- HTML ที่ส่งไปยัง API มี `<!DOCTYPE html>` ซึ่งทำให้เกิด JSON parsing error
- เมื่อ stringify HTML เป็น JSON แล้วส่งไปยัง `/api/print-network`
- API พยายาม parse response แต่ได้ HTML แทน JSON

---

## 🔧 การแก้ไข

### ไฟล์: `app/pos/page.tsx`

**เปลี่ยนจาก:**
```typescript
const html = `<!DOCTYPE html>
<html>
<head>
...
```

**เป็น:**
```typescript
const html = `<html>
<head>
...
```

**เหตุผล:**
- ลบ `<!DOCTYPE html>` ออก
- ทำให้ HTML สามารถ stringify เป็น JSON ได้โดยไม่มีปัญหา
- html2canvas ยังทำงานได้ปกติแม้ไม่มี DOCTYPE

---

## 📋 ฟังก์ชันที่เกี่ยวข้อง

### 1. `printKitchenTickets()`
- Group items ตาม station mapping
- สร้าง HTML ticket สำหรับแต่ละ printer
- เรียก `printHTMLAsImage()` เพื่อพิมพ์

### 2. `createKitchenTicketHTML()`
- สร้าง HTML สำหรับ kitchen ticket
- รองรับ 3 ภาษา (EN, TH, LO)
- รองรับ 2 ขนาดกระดาษ (80mm, 58mm)

### 3. `printHTMLAsImage()`
- แปลง HTML เป็น image ด้วย html2canvas
- ส่ง image ไปยัง `/api/print-network`
- รองรับ Electron และ local network

---

## 🎯 การทำงาน

### Flow การพิมพ์

```
1. User กดปุ่ม "ส่งไปที่ครัว"
   ↓
2. printKitchenTickets() ถูกเรียก
   ↓
3. Group items ตาม station mapping
   ↓
4. สร้าง HTML ticket สำหรับแต่ละ printer
   ↓
5. แปลง HTML เป็น image (html2canvas)
   ↓
6. ส่ง image ไปยัง /api/print-network
   ↓
7. API ส่งไปยัง ESC/POS printer
   ↓
8. Printer พิมพ์ ticket
```

### Kitchen Ticket Format

```
*** ครัว ***
================================================
Table 5
14/5/2026, 2:30:00 AM
================================================
2x  ข้าวผัด
    ไม่ใส่ไข่
1x  ต้มยำกุ้ง
    เผ็ดน้อย
================================================
หมายเหตุ: เร่งด่วน
================================================
```

---

## ✅ การทดสอบ

### ทดสอบใน Development

```cmd
npm run dev
```

1. เปิด POS page
2. เลือกโต๊ะ
3. เพิ่มสินค้า
4. กดปุ่ม "ส่งไปที่ครัว"
5. ตรวจสอบว่าพิมพ์ได้โดยไม่มี error

### ทดสอบใน Production (.exe)

```cmd
npm run build
npx electron-builder --dir
electron-dist\win-unpacked\POS System.exe
```

1. เปิด POS page
2. เลือกโต๊ะ
3. เพิ่มสินค้า
4. กดปุ่ม "ส่งไปที่ครัว"
5. ตรวจสอบว่าพิมพ์ได้

---

## 📝 Requirements

### Station Mapping
- ต้องตั้งค่า Station Mapping ใน Settings
- Map category → printer
- Map specific item → printer (optional)

### Printer Configuration
- ต้องตั้งค่า Printer ใน Settings
- ระบุ IP address
- Enable printer
- เลือกขนาดกระดาษ (80mm/58mm)

---

## 🔍 Debugging

### เปิด Console Logs

กด F12 แล้วดู Console จะเห็น logs:

```
[PRINT] printKitchenTickets called with items: 3
[PRINT] stationMappings: [...]
[PRINT] printerConfigs: [...]
[PRINT] Processing item: ข้าวผัด category: 1
[PRINT] Found mapping for item: ข้าวผัด printer: printer-1
[PRINT] Items grouped by printer: {...}
[PRINT] Processing printer: printer-1 with items: 2
[PRINT] Printing to: Kitchen Printer IP: 192.168.1.100
[PRINT] Successfully printed to: Kitchen Printer
```

### ตรวจสอบ Network

```powershell
# Test printer connection
Test-NetConnection -ComputerName 192.168.1.100 -Port 9100
```

---

## 🐛 Troubleshooting

### 1. "No station mappings configured"

**วิธีแก้:**
1. ไปที่ Settings → Station Mapping
2. เพิ่ม mapping: Category → Printer
3. Save

### 2. "No printers configured"

**วิธีแก้:**
1. ไปที่ Settings → Config Printing
2. เพิ่ม printer
3. ระบุ IP address
4. Enable printer

### 3. "Failed to print to Kitchen Printer"

**วิธีแก้:**
1. ตรวจสอบ printer IP address
2. ตรวจสอบว่า printer เปิดอยู่
3. ตรวจสอบ network connection
4. ลอง ping printer: `ping 192.168.1.100`

### 4. "Item has no station mapping"

**วิธีแก้:**
1. ไปที่ Settings → Station Mapping
2. เพิ่ม mapping สำหรับ category ของสินค้านั้น
3. หรือเพิ่ม mapping สำหรับสินค้าเฉพาะ

---

## 📊 API Endpoints

### `/api/print-network` (POST)

**Request:**
```json
{
  "printerIp": "192.168.1.100",
  "imageData": "data:image/png;base64,...",
  "paperWidth": "80mm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Printed successfully"
}
```

---

## 🎨 Customization

### เปลี่ยนขนาดตัวอักษร

แก้ไขใน `createKitchenTicketHTML()`:

```typescript
.title { font-size: 42px; }  // หัวเรื่อง
.info { font-size: 33px; }   // ข้อมูลโต๊ะ/เวลา
.item { font-size: 33px; }   // รายการสินค้า
.detail { font-size: 27px; } // รายละเอียด/หมายเหตุ
```

### เปลี่ยนภาษา

แก้ไขใน `createKitchenTicketHTML()`:

```typescript
const kitchenTitle = currentLanguage === 'th' ? 'ครัว' : 
                    currentLanguage === 'lo' ? 'ຫ້ອງຄົວ' : 
                    'Kitchen';
```

### เปลี่ยน Separator

แก้ไขใน `createKitchenTicketHTML()`:

```typescript
const separator = paperSize === '80mm' 
  ? '================================================' 
  : '================================';
```

---

## 🚀 วิธี Build

```cmd
# Build
npm run build && npx electron-builder --dir

# ไฟล์ที่ได้
electron-dist\win-unpacked\POS System.exe
```

---

## ✅ Checklist

- [x] แก้ไข JSON parsing error
- [x] ลบ `<!DOCTYPE html>`
- [x] Build สำเร็จ
- [x] ทดสอบพิมพ์ได้
- [x] รองรับ 3 ภาษา
- [x] รองรับ 2 ขนาดกระดาษ
- [x] Station mapping ทำงานได้
- [x] Printer configuration ทำงานได้

---

**วันที่:** 14 พฤษภาคม 2026

**สถานะ:** ✅ เสร็จสมบูรณ์

**ทดสอบแล้ว:** ✅ ผ่าน
