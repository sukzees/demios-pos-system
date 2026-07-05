# งานที่ต้องทำ - POS System

## 1. ไม่ให้ Inventory สร้าง Item Auto ใน Items & Categories
**สถานะ:** รอดำเนินการ

**รายละเอียด:**
- ปัจจุบัน: เมื่อสร้าง New Item ในหน้า Inventory จะสร้าง Item ใน Items & Categories อัตโนมัติ
- ต้องการ: ไม่ต้องสร้าง auto ให้แยกกันเป็นอิสระ

**ไฟล์ที่ต้องแก้:**
- `app/inventory/page.tsx` - ลบการ insert ไปที่ตาราง items หรือ recipes

---

## 2. Popup ป้อนราคาเมื่อเมนูราคา 0
**สถานะ:** รอดำเนินการ

**รายละเอียด:**
- เมื่อเมนูใน Items & Categories มีราคา = 0
- เมื่อกดเพิ่มเข้า Cart ในหน้า POS
- แสดง Popup ให้ป้อนราคาได้ตามต้องการ

**ฟีเจอร์:**
- Dialog แสดงตัวเลข Numpad
- ยืนยันราคาก่อนเพิ่มเข้า Cart
- แสดงชื่อเมนูที่กำลังเพิ่ม

**ไฟล์ที่ต้องแก้:**
- `app/pos/page.tsx` - เพิ่ม Dialog และ logic ตรวจสอบราคา

---

## 3. Smart Filter ในหน้า Items & Categories
**สถานะ:** รอดำเนินการ

**รายละเอียด:**
- เพิ่มปุ่ม Filter ที่สามารถกรองตาม:
  - Type: Standalone / Recipe / Sale Only
  - Stock Status: All / In Stock / Low Stock / Out of Stock
  - Category: All / เลือกตามหมวดหมู่

**UI:**
- Dropdown หรือ Tabs สำหรับเลือก Filter
- แสดงจำนวนรายการที่กรองได้
- สามารถรีเซ็ต Filter ได้

**ไฟล์ที่ต้องแก้:**
- `app/items/page.tsx` - เพิ่ม Filter UI และ logic

---

## 4. แก้ไขการพิมพ์ Online ให้ทำงานได้ปกติ
**สถานะ:** รอดำเนินการ

**รายละเอียด:**
- ปัจจุบัน: การพิมพ์แบบ Online (System-Driver) ไม่ทำงาน หรือมีปัญหา
- ต้องการ: แก้ไขให้พิมพ์ได้ปกติผ่าน System Printer

**วิธีแก้:**
- ตรวจสอบ iframe print method
- ปรับปรุง print dialog
- ทดสอบกับ System Printer

**ไฟล์ที่ต้องแก้:**
- `app/pos/page.tsx` - ส่วน printKitchenTickets และ handleSendToKitchen

---

## ลำดับการทำงาน:
1. [x] แก้ไขบิลครัวให้เหมาะกับกระดาษ 80mm
2. [x] แก้ไขไอคอนโปรแกรม
3. [x] แก้ไขเมนู Sale Only ให้แสดงใน POS
4. [ ] ไม่ให้ Inventory สร้าง Item Auto
5. [ ] Popup ป้อนราคาเมื่อราคา 0
6. [ ] Smart Filter ใน Items & Categories
7. [ ] แก้ไขการพิมพ์ Online

---

**วันที่สร้าง:** 14 พฤษภาคม 2026
