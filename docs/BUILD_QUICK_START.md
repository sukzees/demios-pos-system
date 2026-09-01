# คู่มือ Build เร็ว - POS System

## 🚀 Build เป็น .exe ใน 3 ขั้นตอน

### 1️⃣ เปิด Command Prompt แบบ Admin

```cmd
# กด Windows Key → พิมพ์ "cmd" → คลิกขวา → Run as administrator
cd d:\Projects\POS\supabase-pos-system
```

### 2️⃣ Build Next.js

```cmd
npm run build
```

รอ 2-5 นาที จนเสร็จ

### 3️⃣ Build Electron

```cmd
npm run electron-build-simple
```

รอ 1-3 นาที จนเสร็จ

### 4️⃣ เปิดใช้งาน

```cmd
# ไฟล์ .exe จะอยู่ที่:
dist\win-unpacked\POS System.exe
```

Double-click เพื่อเปิดโปรแกรม

---

## ⚡ คำสั่งเดียวจบ

```cmd
npm run build && npm run electron-build-simple
```

---

## 🔧 แก้ปัญหาเบื้องต้น

### หน้าจอขาว
- รอสักครู่ (10-20 วินาที)
- กด F12 ดู Console
- กด Ctrl+R เพื่อ Reload

### Build ไม่ได้
- ต้องเปิด Command Prompt แบบ Administrator
- หรือเปิด Developer Mode ใน Windows Settings

### Server ไม่เริ่ม
```cmd
npm run clean
npm run build
npm run electron-build-simple
```

---

## 📦 โครงสร้างไฟล์

```
dist/
└── win-unpacked/
    ├── POS System.exe    ← ไฟล์หลัก
    ├── resources/
    │   └── app/          ← Next.js server
    └── ...
```

---

## 🎯 การใช้งาน

### Development (พัฒนา)
```cmd
npm run electron-dev
```

### Production (ใช้งานจริง)
```cmd
npm run build
npm run electron-build-simple
```

---

## 📝 หมายเหตุ

- ✅ ใช้ `output: 'standalone'` ใน next.config.ts
- ✅ API routes ทำงานได้ปกติ
- ✅ Database connection ทำงานได้ปกติ
- ✅ Printing ทำงานได้ปกติ
- ✅ ไม่ต้องติดตั้ง Node.js แยก
- ✅ ไม่ต้องรัน server แยก

---

## 🎉 เสร็จแล้ว!

หลัง build เสร็จ:
1. ไปที่ `dist\win-unpacked\`
2. Double-click `POS System.exe`
3. รอโหลดสักครู่
4. เริ่มใช้งาน!

---

## 📚 เอกสารเพิ่มเติม

- `ELECTRON_BUILD_GUIDE.md` - คู่มือละเอียด
- `HOW_TO_BUILD_EXE.md` - วิธี build แบบเต็ม
- `BUILD_AS_ADMIN.md` - การแก้ปัญหา permission
