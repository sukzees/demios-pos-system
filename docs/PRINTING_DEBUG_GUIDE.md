# คู่มือแก้ปัญหาการพิมพ์

## ปัญหา: กดส่งไปครัวแล้วไม่พิมพ์

### ขั้นตอนการตรวจสอบ

## 1. เปิด Console เพื่อดู Logs

### วิธีเปิด Console:
- กด `F12` หรือ `Ctrl+Shift+I`
- เลือก tab "Console"

### Logs ที่ควรเห็น:

เมื่อกด "Send to Kitchen" ควรเห็น:

```
[PRINT] printKitchenTickets called with items: 2
[PRINT] stationMappings: [{...}]
[PRINT] printerConfigs: [{...}]
[PRINT] Processing item: Pad Thai category: abc-123
[PRINT] Found mapping for item: Pad Thai printer: printer-1
[PRINT] Items grouped by printer: {printer-1: [...]}
[PRINT] Processing printer: printer-1 with items: 2
[PRINT] Printing to: Kitchen Printer IP: 192.168.100.100
[PRINT] Successfully printed to: Kitchen Printer
```

---

## 2. ตรวจสอบ Station Mapping

### ไปที่: Settings → Station Mapping

ตรวจสอบว่า:
- [ ] มี mapping สำหรับ category ของสินค้า
- [ ] เลือก printer ที่ถูกต้อง
- [ ] Specific Item เป็น "All Items (*)"

### ตัวอย่าง Mapping ที่ถูกต้อง:

| Category | Station Name | Printer | Specific Item |
|----------|--------------|---------|---------------|
| Food | Kitchen | Kitchen Printer | All Items (*) |
| Drinks | Bar | Bar Printer | All Items (*) |

---

## 3. ตรวจสอบ Printer Configuration

### ไปที่: Settings → Config Printing

ตรวจสอบว่า:
- [ ] มี printer อยู่ในรายการ
- [ ] Printer เป็น "Enabled" (สีเขียว)
- [ ] IP Address ถูกต้อง (เช่น 192.168.100.100)

### ทดสอบ Printer:

```bash
# เปิด Command Prompt (cmd)
# Ping เครื่องพิมพ์
ping 192.168.100.100

# ควรเห็น:
Reply from 192.168.100.100: bytes=32 time<1ms TTL=64
```

ถ้า ping ไม่ผ่าน:
- ตรวจสอบว่าเครื่องพิมพ์เปิดอยู่
- ตรวจสอบ network cable
- ตรวจสอบว่าอยู่ใน network เดียวกัน

---

## 4. ตรวจสอบ Console Logs

### Case 1: ไม่มี Station Mapping

```
[PRINT] No station mappings configured
```

**วิธีแก้:** ไปตั้งค่า Station Mapping ใน Settings

### Case 2: ไม่มี Printer

```
[PRINT] No printers configured
```

**วิธีแก้:** ไปเพิ่ม Printer ใน Settings → Config Printing

### Case 3: Item ไม่มี Mapping

```
[PRINT] Item "Pad Thai" has no station mapping - not sent to kitchen
```

**วิธีแก้:** 
1. ไปที่ Settings → Station Mapping
2. เพิ่ม mapping สำหรับ category ของ Pad Thai
3. เลือก Specific Item = "All Items (*)"

### Case 4: Printer ถูก Disable

```
[PRINT] Printer disabled: Kitchen Printer
```

**วิธีแก้:** 
1. ไปที่ Settings → Config Printing
2. คลิก toggle เพื่อ Enable printer

### Case 5: Printer Not Found

```
[PRINT] Printer not found: printer-1
```

**วิธีแก้:** 
1. ลบ Station Mapping เก่า
2. สร้าง Station Mapping ใหม่
3. เลือก printer ที่มีอยู่จริง

### Case 6: Print Failed

```
[PRINT] Failed to print: connect ETIMEDOUT 192.168.100.100:9100
```

**วิธีแก้:**
1. ตรวจสอบว่า ping ถึงเครื่องพิมพ์ได้
2. ตรวจสอบว่า port 9100 เปิดอยู่
3. ตรวจสอบ firewall

---

## 5. ทดสอบการพิมพ์

### ขั้นตอนทดสอบ:

1. **เพิ่มสินค้าเข้า Cart**
   - เลือกสินค้าที่มี Station Mapping

2. **เปิด Console (F12)**
   - ดู logs ที่จะปรากฏ

3. **กด "Send to Kitchen"**
   - ดู logs ว่ามี error หรือไม่

4. **ตรวจสอบเครื่องพิมพ์**
   - ควรมีกระดาษออกมา

---

## 6. Checklist การตรวจสอบ

ก่อนพิมพ์ ตรวจสอบ:

- [ ] เครื่องพิมพ์เปิดอยู่
- [ ] เครื่องพิมพ์มีกระดาษ
- [ ] Ping ถึงเครื่องพิมพ์ได้ (`ping 192.168.100.100`)
- [ ] มี Printer Config ใน Settings
- [ ] Printer เป็น "Enabled"
- [ ] มี Station Mapping
- [ ] Station Mapping เลือก printer ที่ถูกต้อง
- [ ] Specific Item = "All Items (*)"
- [ ] สินค้าที่เลือกมี category ที่ map แล้ว

---

## 7. ปัญหาที่พบบ่อย

### ปัญหา: พิมพ์ไม่ออก แต่ไม่มี error

**สาเหตุ:** Item ไม่มี Station Mapping

**วิธีแก้:**
1. เปิด Console (F12)
2. ดู log: `[PRINT] Item "..." has no station mapping`
3. ไปเพิ่ม Station Mapping สำหรับ category นั้น

### ปัญหา: Error "connect ETIMEDOUT"

**สาเหตุ:** เชื่อมต่อเครื่องพิมพ์ไม่ได้

**วิธีแก้:**
```bash
# 1. Ping เครื่องพิมพ์
ping 192.168.100.100

# 2. ถ้า ping ไม่ผ่าน:
# - ตรวจสอบ network cable
# - ตรวจสอบว่าเครื่องพิมพ์เปิดอยู่
# - ตรวจสอบ IP address

# 3. ถ้า ping ผ่าน แต่ยังพิมพ์ไม่ได้:
# - ตรวจสอบ port 9100
telnet 192.168.100.100 9100
```

### ปัญหา: พิมพ์ออกมาแต่ไม่มีข้อความ

**สาเหตุ:** html2canvas ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบ Console มี error หรือไม่
2. ลอง refresh page (F5)
3. ลอง restart Electron app

### ปัญหา: พิมพ์ช้า

**สาเหตุ:** html2canvas ใช้เวลาในการ render

**ปกติ:** ใช้เวลา 2-3 วินาที

**ถ้าช้ากว่า 10 วินาที:**
- ตรวจสอบ CPU usage
- ปิดโปรแกรมอื่นๆ
- ลด resolution ของ image

---

## 8. การ Debug ขั้นสูง

### ดู Network Request:

1. เปิด DevTools (F12)
2. ไปที่ tab "Network"
3. กด "Send to Kitchen"
4. ดู request ไป `/api/print-network`

**ถ้า request สำเร็จ:**
```
Status: 200 OK
Response: {"success": true}
```

**ถ้า request ล้มเหลว:**
```
Status: 500 Internal Server Error
Response: {"success": false, "error": "..."}
```

### ดู API Logs:

ถ้าใช้ `npm run electron-dev` จะเห็น logs ใน terminal:

```
[UPDATE] Starting update process...
[CHECKOUT] Starting checkout...
[PRINT] Printing to: 192.168.100.100
```

---

## 9. วิธีแก้ปัญหาทั่วไป

### แก้ปัญหา 90% ของกรณี:

```bash
# 1. Refresh page
F5

# 2. Restart Electron
Ctrl+C (ใน terminal)
npm run electron-dev

# 3. Clear cache
npm run clean
npm run build
npm run electron-dev
```

---

## 10. ติดต่อ Support

ถ้าแก้ไม่ได้ ให้ส่งข้อมูลเหล่านี้:

1. **Screenshot Console Logs** (F12 → Console)
2. **Screenshot Settings:**
   - Station Mapping
   - Config Printing
3. **Ping Result:**
   ```bash
   ping 192.168.100.100
   ```
4. **Error Message** (ถ้ามี)

---

## สรุป

### ขั้นตอนการแก้ปัญหา:

1. ✅ เปิด Console (F12)
2. ✅ กด "Send to Kitchen"
3. ✅ ดู logs ว่ามี error อะไร
4. ✅ แก้ตาม error message
5. ✅ ลองใหม่

### ปัญหาที่พบบ่อยสุด:

1. **ไม่มี Station Mapping** → ไปตั้งค่าใน Settings
2. **Printer ถูก Disable** → Enable ใน Settings
3. **Ping ไม่ถึงเครื่องพิมพ์** → ตรวจสอบ network
4. **Item ไม่มี Mapping** → เพิ่ม mapping สำหรับ category

---

**หมายเหตุ:** หลังจากเพิ่ม console.log แล้ว จะเห็น logs ละเอียดมากขึ้น ช่วยในการ debug ได้ง่ายขึ้น
