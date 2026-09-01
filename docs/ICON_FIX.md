# แก้ไขปัญหาไอคอนโปรแกรมแสดงเป็นสีดำ

## ปัญหา
เมื่อเปิดไฟล์ .exe แล้ว ไอคอนโปรแกรมใน taskbar แสดงเป็นสีดำ

## สาเหตุ
ไฟล์ icon.ico ที่สร้างไว้ก่อนหน้านี้มีรูปแบบ header ที่ไม่ถูกต้องสำหรับ rcedit (เครื่องมือที่ electron-builder ใช้ฝังไอคอนเข้าไปใน .exe)

## วิธีแก้ไข

### 1. สร้างไฟล์ไอคอนใหม่
ใช้สคริปต์ PowerShell `create-icon-v2.ps1` เพื่อสร้างไฟล์ icon.ico ที่มีรูปแบบถูกต้อง:

```powershell
.\create-icon-v2.ps1
```

สคริปต์นี้จะ:
- สร้างภาพ PNG ขนาด 256x256 พร้อมพื้นหลังสีฟ้า (RGB: 33, 150, 243)
- เขียนข้อความ "POS" สีขาวตรงกลาง
- สร้างไฟล์ ICO ที่มีหลายขนาด (16x16, 32x32, 48x48, 256x256)
- ใช้ header format ที่ถูกต้องสำหรับ Windows ICO

### 2. Build โปรแกรมใหม่
หลังจากสร้างไอคอนแล้ว ต้อง build โปรแกรมใหม่:

```bash
npm run build
npx electron-builder --dir
```

### 3. ผลลัพธ์
ไฟล์ `electron-dist\win-unpacked\POS System.exe` จะมีไอคอนสีฟ้าพร้อมข้อความ "POS" สีขาว

## ไฟล์ที่เกี่ยวข้อง
- `public/icons/icon.ico` - ไฟล์ไอคอนหลัก
- `public/icons/icon-256.png` - ไฟล์ PNG ต้นฉบับ
- `create-icon-v2.ps1` - สคริปต์สร้างไอคอน
- `electron-builder.yml` - กำหนดค่า icon path
- `package.json` - กำหนดค่า icon path ใน build section

## ข้อมูลเทคนิค

### ICO Header Format
```
Offset | Size | Description
-------|------|------------
0      | 2    | Reserved (must be 0)
2      | 2    | Type (1 = ICO, 2 = CUR)
4      | 2    | Number of images
6      | 16*n | Directory entries
```

### Directory Entry Format
```
Offset | Size | Description
-------|------|------------
0      | 1    | Width (0 = 256)
1      | 1    | Height (0 = 256)
2      | 1    | Color palette (0 = no palette)
3      | 1    | Reserved (0)
4      | 2    | Color planes (1)
6      | 2    | Bits per pixel (32)
8      | 4    | Size of image data
12     | 4    | Offset to image data
```

## การตรวจสอบ
หลัง build เสร็จ สามารถตรวจสอบได้โดย:
1. เปิดโฟลเดอร์ `electron-dist\win-unpacked\`
2. ดูไอคอนของไฟล์ `POS System.exe` ใน File Explorer
3. เปิดโปรแกรมและดูไอคอนใน taskbar

## วันที่แก้ไข
14 พฤษภาคม 2026
