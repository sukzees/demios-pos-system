# วิธีใช้งาน POS System.exe

## ⚠️ สำคัญ!

**Electron app ต้องการ Next.js server ทำงานอยู่ที่ localhost:3000**

---

## 🚀 วิธีที่ 1: ใช้ Batch Script (ง่ายที่สุด)

1. ไปที่ folder `dist/win-unpacked/`
2. Double-click `start-pos.bat`
3. รอ 5 วินาที
4. POS System จะเปิดขึ้นมาอัตโนมัติ

**เสร็จแล้ว!** ✅

---

## 🚀 วิธีที่ 2: รันด้วยตนเอง

### ขั้นตอนที่ 1: Start Next.js Server

เปิด Command Prompt ที่ folder โปรเจค:

```cmd
npm run start
```

รอจนเห็น:
```
✓ Ready on http://localhost:3000
```

### ขั้นตอนที่ 2: เปิด Electron App

Double-click `POS System.exe` ใน folder `dist/win-unpacked/`

**เสร็จแล้ว!** ✅

---

## 🚀 วิธีที่ 3: ใช้ npm run electron (Development)

ถ้าอยู่ใน folder โปรเจค:

```cmd
npm run electron-dev
```

คำสั่งนี้จะ:
1. Start Next.js dev server
2. Start Electron app
3. ทำงานพร้อมกันอัตโนมัติ

---

## 📦 วิธีแจกจ่ายให้ลูกค้า

### ตัวเลือก A: แจก Folder + Batch Script

1. Copy folder `dist/win-unpacked/` ทั้งหมด
2. Copy folder โปรเจคทั้งหมด (หรือแค่ `.next`, `public`, `package.json`)
3. ให้ลูกค้าติดตั้ง Node.js
4. ให้ลูกค้ารัน `start-pos.bat`

### ตัวเลือก B: Deploy เป็น Web App

1. Deploy Next.js บน server (VPS, Cloud)
2. แก้ไข `electron/main.js` ให้ชี้ไปที่ URL server
3. Build Electron ใหม่
4. แจก `.exe` เดียว (ไม่ต้องรัน server ในเครื่อง)

### ตัวเลือก C: ใช้ PM2 (Production)

1. ติดตั้ง PM2: `npm install -g pm2`
2. Start server: `pm2 start npm --name "pos-server" -- start`
3. ตั้งให้รันตอน boot: `pm2 startup` และ `pm2 save`
4. รัน `POS System.exe` ได้เลย

---

## 🔧 Troubleshooting

### ปัญหา: หน้าว่างเปล่า

**สาเหตุ:** Next.js server ไม่ได้รัน

**วิธีแก้:**
1. เปิด Command Prompt
2. รัน `npm run start`
3. รอจนเห็น "Ready on http://localhost:3000"
4. เปิด `.exe` ใหม่

### ปัญหา: Cannot connect to server

**สาเหตุ:** Port 3000 ถูกใช้งานอยู่

**วิธีแก้:**
1. ปิดโปรแกรมที่ใช้ port 3000
2. หรือแก้ไข port ใน `electron/main.js` และ `package.json`

### ปัญหา: 404 Not Found

**สาเหตุ:** ไม่ได้ build Next.js

**วิธีแก้:**
```cmd
npm run build
npm run start
```

---

## ✅ สรุป

**วิธีที่แนะนำ:**

1. **Development:** `npm run electron-dev`
2. **Production:** รัน `start-pos.bat`
3. **Deploy:** Deploy Next.js บน server แล้วแก้ URL ใน Electron

---

## 📝 หมายเหตุ

- Electron app เป็นแค่ wrapper สำหรับเปิด Next.js web app
- ต้องมี Next.js server รันอยู่เสมอ
- ถ้าต้องการ standalone app ที่ไม่ต้องรัน server แยก ต้องใช้วิธีอื่น (เช่น Tauri, NW.js)

---

**สร้างโดย:** Kiro AI Assistant
**วันที่:** 13 พฤษภาคม 2026
